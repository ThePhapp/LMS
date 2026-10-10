const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const yauzl = require('yauzl');

const MEBIBYTE = 1024 * 1024;
const ZIP_LIMITS = Object.freeze({
  maxCompressedBytes: 100 * MEBIBYTE,
  maxEntries: 5000,
  maxDepth: 20,
  maxPathBytes: 1024,
  maxComponentBytes: 255,
  maxFileBytes: 128 * MEBIBYTE,
  maxExpandedBytes: 512 * MEBIBYTE,
  maxCompressionRatio: 100
});

const DANGEROUS_EXTENSIONS = new Set(['.exe', '.bat', '.cmd', '.sh', '.php']);
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const FILE_TYPE_MASK = 0o170000;
const FILE_TYPE_REGULAR = 0o100000;
const FILE_TYPE_DIRECTORY = 0o040000;

class ZipValidationError extends Error {
  constructor(code, message, statusCode = 422, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ZipValidationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function limitError(code, message) {
  return new ZipValidationError(code, message, 413);
}

function invalidError(code, message, cause) {
  return new ZipValidationError(code, message, 422, cause);
}

function archiveError(error) {
  if (error instanceof ZipValidationError) return error;

  const message = String(error?.message || '');
  if (/backslash|absolute path|relative path|invalid characters in fileName/i.test(message)) {
    return invalidError('ZIP_PATH_INVALID', 'ZIP contains an unsafe entry path', error);
  }

  return invalidError('ZIP_INVALID', 'Invalid ZIP archive', error);
}

function extractionError(error) {
  if (error instanceof ZipValidationError) return error;
  if (error?.code === 'EEXIST' || error?.code === 'ENOTDIR' || error?.code === 'EISDIR') {
    return invalidError('ZIP_PATH_CONFLICT', 'ZIP contains conflicting entry paths', error);
  }
  if (!error?.code || String(error.code).startsWith('Z_')) return archiveError(error);

  return new ZipValidationError('ZIP_EXTRACTION_FAILED', 'ZIP extraction failed', 500, error);
}

function isPathInside(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function validateLegacyLinkMetadata(entry) {
  for (const field of entry.extraFields || []) {
    // Info-ZIP Unix (0x000d) appends a link target after its 12-byte fixed section.
    if (field.id === 0x000d && field.data.length > 12) {
      throw invalidError('ZIP_ENTRY_TYPE_INVALID', 'ZIP links and special files are not allowed');
    }

    // ASi Unix (0x756e) has a 14-byte fixed section followed by an optional link target.
    if (field.id === 0x756e) {
      if (field.data.length > 14) {
        throw invalidError('ZIP_ENTRY_TYPE_INVALID', 'ZIP links and special files are not allowed');
      }
      if (field.data.length >= 6) {
        const mode = field.data.readUInt16LE(4);
        const type = mode & FILE_TYPE_MASK;
        if (type !== 0 && type !== FILE_TYPE_REGULAR && type !== FILE_TYPE_DIRECTORY) {
          throw invalidError('ZIP_ENTRY_TYPE_INVALID', 'ZIP links and special files are not allowed');
        }
      }
    }
  }
}

function validateEntryType(entry, isDirectory) {
  const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
  const type = mode & FILE_TYPE_MASK;

  if (type !== 0) {
    const expectedType = isDirectory ? FILE_TYPE_DIRECTORY : FILE_TYPE_REGULAR;
    if (type !== expectedType) {
      throw invalidError('ZIP_ENTRY_TYPE_INVALID', 'ZIP links and special files are not allowed');
    }
  }

  const dosAttributes = entry.externalFileAttributes & 0xff;
  if ((dosAttributes & 0x08) !== 0 || (dosAttributes & 0x40) !== 0) {
    throw invalidError('ZIP_ENTRY_TYPE_INVALID', 'ZIP volume and device entries are not allowed');
  }

  validateLegacyLinkMetadata(entry);
}

function normalizeEntryPath(entry, destinationRoot) {
  const fileName = entry.fileName;
  if (typeof fileName !== 'string' || fileName.length === 0) {
    throw invalidError('ZIP_PATH_INVALID', 'ZIP contains an empty entry path');
  }
  if (fileName.includes('\\') || fileName.startsWith('/') || /^[a-zA-Z]:/.test(fileName)) {
    throw invalidError('ZIP_PATH_INVALID', 'ZIP contains an unsafe entry path');
  }
  if (Buffer.byteLength(fileName, 'utf8') > ZIP_LIMITS.maxPathBytes) {
    throw limitError('ZIP_PATH_TOO_LONG', 'ZIP entry path exceeds the allowed length');
  }

  const isDirectory = fileName.endsWith('/');
  const pathWithoutTrailingSlash = isDirectory ? fileName.slice(0, -1) : fileName;
  const parts = pathWithoutTrailingSlash.split('/');

  if (!pathWithoutTrailingSlash || parts.some((part) => part === '' || part === '.' || part === '..')) {
    throw invalidError('ZIP_PATH_INVALID', 'ZIP contains an unsafe entry path');
  }
  if (parts.length > ZIP_LIMITS.maxDepth) {
    throw limitError('ZIP_NESTING_TOO_DEEP', 'ZIP entry nesting exceeds the allowed depth');
  }

  for (const part of parts) {
    if (
      Buffer.byteLength(part, 'utf8') > ZIP_LIMITS.maxComponentBytes ||
      /[\u0000-\u001f\u007f:*?"<>|]/.test(part) ||
      /[. ]$/.test(part) ||
      WINDOWS_RESERVED_NAME.test(part)
    ) {
      throw invalidError('ZIP_PATH_INVALID', 'ZIP contains an unsafe entry path');
    }
  }

  const targetPath = path.resolve(destinationRoot, ...parts);
  if (!isPathInside(destinationRoot, targetPath)) {
    throw invalidError('ZIP_PATH_INVALID', 'ZIP entry escapes the extraction directory');
  }

  validateEntryType(entry, isDirectory);

  return {
    isDirectory,
    parts,
    relativePath: parts.join('/'),
    targetPath
  };
}

function validateEntrySizes(entry, descriptor, totals) {
  const { compressedSize, uncompressedSize } = entry;
  if (
    !Number.isSafeInteger(compressedSize) || compressedSize < 0 ||
    !Number.isSafeInteger(uncompressedSize) || uncompressedSize < 0
  ) {
    throw invalidError('ZIP_INVALID', 'ZIP contains invalid entry sizes');
  }
  if (descriptor.isDirectory && (compressedSize !== 0 || uncompressedSize !== 0)) {
    throw invalidError('ZIP_INVALID', 'ZIP directory entries must be empty');
  }
  if (uncompressedSize > ZIP_LIMITS.maxFileBytes) {
    throw limitError('ZIP_FILE_TOO_LARGE', 'A ZIP entry exceeds the expanded file-size limit');
  }
  if (uncompressedSize > 0 && compressedSize === 0) {
    throw limitError('ZIP_COMPRESSION_RATIO_TOO_HIGH', 'ZIP entry compression ratio exceeds the allowed limit');
  }
  if (compressedSize > 0 && uncompressedSize / compressedSize > ZIP_LIMITS.maxCompressionRatio) {
    throw limitError('ZIP_COMPRESSION_RATIO_TOO_HIGH', 'ZIP entry compression ratio exceeds the allowed limit');
  }

  totals.expandedBytes += uncompressedSize;
  if (!Number.isSafeInteger(totals.expandedBytes) || totals.expandedBytes > ZIP_LIMITS.maxExpandedBytes) {
    throw limitError('ZIP_EXPANDED_TOO_LARGE', 'ZIP expanded size exceeds the allowed total');
  }
}

async function inspectArchive(zipFile, destinationRoot) {
  const entries = [];
  const seenPaths = new Set();
  const filePaths = new Set();
  const requiredDirectoryPaths = new Set();
  const totals = { expandedBytes: 0 };

  try {
    for await (const entry of zipFile.eachEntry()) {
      if (entries.length >= ZIP_LIMITS.maxEntries) {
        throw limitError('ZIP_TOO_MANY_ENTRIES', 'ZIP contains too many entries');
      }
      if (entry.isEncrypted() || !entry.canDecodeFileData()) {
        throw invalidError('ZIP_UNSUPPORTED_ENTRY', 'Encrypted or unsupported ZIP entries are not allowed');
      }

      const descriptor = normalizeEntryPath(entry, destinationRoot);
      const canonicalPath = descriptor.relativePath.normalize('NFC').toLowerCase();
      if (seenPaths.has(canonicalPath)) {
        throw invalidError('ZIP_PATH_CONFLICT', 'ZIP contains duplicate entry paths');
      }

      for (let i = 1; i < descriptor.parts.length; i += 1) {
        const parentPath = descriptor.parts.slice(0, i).join('/').normalize('NFC').toLowerCase();
        if (filePaths.has(parentPath)) {
          throw invalidError('ZIP_PATH_CONFLICT', 'ZIP contains conflicting entry paths');
        }
        requiredDirectoryPaths.add(parentPath);
      }

      if (descriptor.isDirectory) {
        if (filePaths.has(canonicalPath)) {
          throw invalidError('ZIP_PATH_CONFLICT', 'ZIP contains conflicting entry paths');
        }
      } else {
        if (requiredDirectoryPaths.has(canonicalPath)) {
          throw invalidError('ZIP_PATH_CONFLICT', 'ZIP contains conflicting entry paths');
        }
        filePaths.add(canonicalPath);
        const extension = path.posix.extname(descriptor.relativePath).toLowerCase();
        if (DANGEROUS_EXTENSIONS.has(extension)) {
          throw invalidError('ZIP_PROHIBITED_FILE', 'ZIP contains a prohibited file type');
        }
      }

      validateEntrySizes(entry, descriptor, totals);
      seenPaths.add(canonicalPath);
      entries.push({ entry, ...descriptor });
    }
  } catch (error) {
    throw archiveError(error);
  }

  const indexEntries = entries
    .filter((item) => !item.isDirectory && item.parts[item.parts.length - 1] === 'index.html')
    .sort((a, b) => a.parts.length - b.parts.length || a.relativePath.localeCompare(b.relativePath));

  if (indexEntries.length === 0) {
    throw invalidError('ZIP_INDEX_REQUIRED', 'ZIP package must contain index.html');
  }

  return { entries, indexEntry: indexEntries[0] };
}

async function extractEntries(zipFile, entries) {
  let actualExpandedBytes = 0;

  for (const item of entries) {
    if (item.isDirectory) {
      await fsp.mkdir(item.targetPath, { recursive: true, mode: 0o700 });
      continue;
    }

    await fsp.mkdir(path.dirname(item.targetPath), { recursive: true, mode: 0o700 });
    let fileBytes = 0;
    const byteCounter = new Transform({
      transform(chunk, encoding, callback) {
        fileBytes += chunk.length;
        actualExpandedBytes += chunk.length;

        if (fileBytes > ZIP_LIMITS.maxFileBytes) {
          callback(limitError('ZIP_FILE_TOO_LARGE', 'A ZIP entry exceeds the expanded file-size limit'));
          return;
        }
        if (actualExpandedBytes > ZIP_LIMITS.maxExpandedBytes) {
          callback(limitError('ZIP_EXPANDED_TOO_LARGE', 'ZIP expanded size exceeds the allowed total'));
          return;
        }
        if (
          fileBytes > 0 &&
          (item.entry.compressedSize === 0 || fileBytes / item.entry.compressedSize > ZIP_LIMITS.maxCompressionRatio)
        ) {
          callback(limitError('ZIP_COMPRESSION_RATIO_TOO_HIGH', 'ZIP entry compression ratio exceeds the allowed limit'));
          return;
        }

        callback(null, chunk);
      }
    });

    try {
      const readStream = await zipFile.openReadStreamPromise(item.entry);
      const writeStream = fs.createWriteStream(item.targetPath, { flags: 'wx', mode: 0o600 });
      await pipeline(readStream, byteCounter, writeStream);
      if (fileBytes !== item.entry.uncompressedSize) {
        throw invalidError('ZIP_INVALID', 'ZIP entry size does not match its metadata');
      }
    } catch (error) {
      await fsp.unlink(item.targetPath).catch(() => {});
      throw extractionError(error);
    }
  }
}

async function prepareDestination(extractPath) {
  const destinationRoot = path.resolve(extractPath);
  if (destinationRoot === path.parse(destinationRoot).root) {
    throw new ZipValidationError('ZIP_DESTINATION_INVALID', 'ZIP extraction destination is invalid', 500);
  }

  try {
    const stat = await fsp.lstat(destinationRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new ZipValidationError('ZIP_DESTINATION_INVALID', 'ZIP extraction destination is invalid', 500);
    }
    if ((await fsp.readdir(destinationRoot)).length !== 0) {
      throw new ZipValidationError('ZIP_DESTINATION_NOT_EMPTY', 'ZIP extraction destination must be empty', 500);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fsp.mkdir(destinationRoot, { recursive: true, mode: 0o700 });
  }

  return destinationRoot;
}

async function validateExtractedIndex(destinationRoot, indexEntry) {
  const stat = await fsp.lstat(indexEntry.targetPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw invalidError('ZIP_INDEX_REQUIRED', 'ZIP package must contain a regular index.html file');
  }

  const [rootRealPath, indexRealPath] = await Promise.all([
    fsp.realpath(destinationRoot),
    fsp.realpath(indexEntry.targetPath)
  ]);
  if (!isPathInside(rootRealPath, indexRealPath)) {
    throw invalidError('ZIP_PATH_INVALID', 'ZIP index.html escapes the extraction directory');
  }

  return indexRealPath;
}

async function extractWithOpener(openZip, compressedBytes, extractPath) {
  let destinationRoot;
  let zipFile;

  try {
    if (!Number.isSafeInteger(compressedBytes) || compressedBytes < 0) {
      throw invalidError('ZIP_INVALID', 'ZIP upload size is invalid');
    }
    if (compressedBytes > ZIP_LIMITS.maxCompressedBytes) {
      throw limitError('ZIP_TOO_LARGE', 'ZIP upload exceeds the 100 MiB limit');
    }

    destinationRoot = await prepareDestination(extractPath);
    try {
      zipFile = await openZip();
    } catch (error) {
      throw archiveError(error);
    }

    const { entries, indexEntry } = await inspectArchive(zipFile, destinationRoot);
    await extractEntries(zipFile, entries);
    const indexPath = await validateExtractedIndex(destinationRoot, indexEntry);

    return {
      success: true,
      indexPath,
      error: null,
      code: null,
      statusCode: null
    };
  } catch (error) {
    const normalized = extractionError(error);
    if (destinationRoot) {
      try {
        await fsp.rm(destinationRoot, { recursive: true, force: true });
      } catch {
        return {
          success: false,
          indexPath: null,
          error: 'ZIP cleanup failed',
          code: 'ZIP_CLEANUP_FAILED',
          statusCode: 500
        };
      }
    }

    return {
      success: false,
      indexPath: null,
      error: normalized.message,
      code: normalized.code,
      statusCode: normalized.statusCode
    };
  } finally {
    if (zipFile) zipFile.close();
  }
}

/**
 * Extract a ZIP buffer after validating all archive metadata.
 * @param {Buffer} zipBuffer
 * @param {string} extractPath
 */
async function extractPackage(zipBuffer, extractPath) {
  if (!Buffer.isBuffer(zipBuffer)) {
    return {
      success: false,
      indexPath: null,
      error: 'Invalid ZIP archive',
      code: 'ZIP_INVALID',
      statusCode: 422
    };
  }

  return extractWithOpener(
    () => yauzl.fromBufferPromise(zipBuffer, {
      autoClose: false,
      decodeStrings: true,
      validateEntrySizes: true,
      strictFileNames: true
    }),
    zipBuffer.length,
    extractPath
  );
}

/**
 * Extract a ZIP file after validating its source and all archive metadata.
 * @param {string} zipPath
 * @param {string} extractPath
 */
async function extractPackageFromFile(zipPath, extractPath) {
  let stat;
  try {
    stat = await fsp.lstat(zipPath);
  } catch {
    return {
      success: false,
      indexPath: null,
      error: 'ZIP upload is not a readable regular file',
      code: 'ZIP_SOURCE_INVALID',
      statusCode: 422
    };
  }

  if (!stat.isFile() || stat.isSymbolicLink()) {
    return {
      success: false,
      indexPath: null,
      error: 'ZIP upload is not a readable regular file',
      code: 'ZIP_SOURCE_INVALID',
      statusCode: 422
    };
  }

  return extractWithOpener(
    () => yauzl.openPromise(zipPath, {
      autoClose: false,
      decodeStrings: true,
      validateEntrySizes: true,
      strictFileNames: true
    }),
    stat.size,
    extractPath
  );
}

async function findIndexHtml(dir) {
  try {
    const files = await fsp.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.name === 'index.html' && file.isFile()) return fullPath;
      if (file.isDirectory() && !file.name.startsWith('.')) {
        const found = await findIndexHtml(fullPath);
        if (found) return found;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function getPackageUrl(packageId, indexPath) {
  const baseDir = path.join(__dirname, '../public/packages');
  const relativePath = path.relative(baseDir, indexPath).split(path.sep).join('/');
  const packageDir = path.posix.dirname(relativePath);
  return `/packages/${packageDir}/index.html`;
}

async function cleanupPackage(packagePath) {
  await fsp.rm(packagePath, { recursive: true, force: true });
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  ZIP_LIMITS,
  ZipValidationError,
  extractPackage,
  extractPackageFromFile,
  findIndexHtml,
  getPackageUrl,
  cleanupPackage,
  pathExists
};
