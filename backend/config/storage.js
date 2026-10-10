const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const PRIVATE_UPLOAD_ROOT = path.resolve(__dirname, '../uploads/private');

class FileStorageError extends Error {
  constructor(code, message, statusCode = 500) {
    super(message);
    this.name = 'FileStorageError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function requireR2Configuration(bucket = R2_BUCKET) {
  const required = [
    process.env.R2_ACCOUNT_ID,
    process.env.R2_ACCESS_KEY_ID,
    process.env.R2_SECRET_ACCESS_KEY,
    bucket,
  ];
  if (required.some((value) => !value)) {
    throw new FileStorageError('STORAGE_UNAVAILABLE', 'File storage is not configured', 503);
  }
}

function r2Locator(key) {
  return `r2://${key}`;
}

function storageKeyFromLocator(locator) {
  if (typeof locator !== 'string' || !locator) return null;
  if (locator.startsWith('r2://')) return locator.slice('r2://'.length);
  if (R2_PUBLIC_URL) {
    const prefix = `${R2_PUBLIC_URL.replace(/\/$/, '')}/`;
    if (locator.startsWith(prefix)) return locator.slice(prefix.length);
  }
  return null;
}

function bucketForLocator(locator) {
  return locator?.startsWith('r2://') ? R2_PRIVATE_BUCKET : R2_BUCKET;
}

function resolvePrivateLocalPath(locator) {
  if (typeof locator !== 'string') return null;
  let relativePath;
  if (locator.startsWith('local://')) {
    relativePath = locator.slice('local://'.length);
  } else if (locator.startsWith('/uploads/')) {
    relativePath = `../${locator.slice('/uploads/'.length)}`;
  } else {
    return null;
  }

  const resolved = path.resolve(PRIVATE_UPLOAD_ROOT, relativePath);
  const legacyRoot = path.resolve(__dirname, '../uploads');
  const permittedRoot = locator.startsWith('local://') ? PRIVATE_UPLOAD_ROOT : legacyRoot;
  const relative = path.relative(permittedRoot, resolved);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new FileStorageError('STORAGE_PATH_INVALID', 'Stored file path is invalid', 422);
  }
  return resolved;
}

/**
 * Upload a buffer to Cloudflare R2
 * @param {Buffer} buffer - File data
 * @param {string} folder - Logical folder (e.g. 'lesson-files', 'avatars')
 * @param {string} filePath - Filename inside folder
 * @param {string} mimeType - MIME type
 * @returns {string} Public URL
 */
async function uploadToStorage(buffer, folder, filePath, mimeType) {
  const key = `${folder}/${filePath}`;

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

async function uploadPrivateFileToStorage(localPath, folder, filePath, mimeType) {
  requireR2Configuration(R2_PRIVATE_BUCKET);
  const key = `${folder}/${filePath}`;
  const stat = await fsp.stat(localPath);
  if (!stat.isFile()) {
    throw new FileStorageError('STORAGE_PATH_INVALID', 'Upload source must be a regular file', 422);
  }

  await s3.send(new PutObjectCommand({
    Bucket: R2_PRIVATE_BUCKET,
    Key: key,
    Body: fs.createReadStream(localPath),
    ContentLength: stat.size,
    ContentType: mimeType,
  }));

  return r2Locator(key);
}

function parseRange(rangeHeader, size) {
  const match = typeof rangeHeader === 'string' && /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : null;
  const end = match[2] ? Number(match[2]) : null;
  if (start === null && end === null) return null;

  const normalizedStart = start === null ? Math.max(0, size - end) : start;
  const normalizedEnd = end === null ? size - 1 : Math.min(end, size - 1);
  if (!Number.isInteger(normalizedStart) || !Number.isInteger(normalizedEnd)
      || normalizedStart < 0 || normalizedStart > normalizedEnd || normalizedStart >= size) {
    throw new FileStorageError('INVALID_RANGE', 'Requested file range is invalid', 416);
  }
  return { start: normalizedStart, end: normalizedEnd };
}

async function openStoredFile(locator, { range } = {}) {
  const localPath = resolvePrivateLocalPath(locator);
  if (localPath) {
    let stat;
    try {
      stat = await fsp.lstat(localPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new FileStorageError('FILE_NOT_FOUND', 'Stored file was not found', 404);
      }
      throw error;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new FileStorageError('FILE_NOT_FOUND', 'Stored file was not found', 404);
    }
    const root = locator.startsWith('local://')
      ? PRIVATE_UPLOAD_ROOT
      : path.resolve(__dirname, '../uploads');
    const [rootRealPath, fileRealPath] = await Promise.all([fsp.realpath(root), fsp.realpath(localPath)]);
    const relative = path.relative(rootRealPath, fileRealPath);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new FileStorageError('STORAGE_PATH_INVALID', 'Stored file path is invalid', 422);
    }
    const selectedRange = parseRange(range, stat.size);
    return {
      body: fs.createReadStream(localPath, selectedRange || undefined),
      contentLength: selectedRange ? selectedRange.end - selectedRange.start + 1 : stat.size,
      contentRange: selectedRange ? `bytes ${selectedRange.start}-${selectedRange.end}/${stat.size}` : null,
      key: null,
    };
  }

  const key = storageKeyFromLocator(locator);
  if (!key) throw new FileStorageError('STORAGE_LOCATOR_INVALID', 'Stored file reference is invalid', 422);
  const bucket = bucketForLocator(locator);
  requireR2Configuration(bucket);
  const response = await s3.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(range ? { Range: range } : {}),
  }));
  return {
    body: response.Body,
    contentLength: response.ContentLength,
    contentRange: response.ContentRange || null,
    contentType: response.ContentType,
    key,
  };
}

async function deleteStoredFile(locator) {
  if (!locator) return;
  const localPath = resolvePrivateLocalPath(locator);
  if (localPath) {
    await fsp.unlink(localPath).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
    return;
  }

  const key = storageKeyFromLocator(locator);
  if (!key) return;
  const bucket = bucketForLocator(locator);
  requireR2Configuration(bucket);
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function deleteStoragePrefix(prefix, { privateBucket = false } = {}) {
  if (!prefix) return;
  const bucket = privateBucket ? R2_PRIVATE_BUCKET : R2_BUCKET;
  requireR2Configuration(bucket);
  let continuationToken;
  do {
    const listed = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    await deleteStorageKeys(
      (listed.Contents || []).map((item) => item.Key),
      { privateBucket },
    );
    continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (continuationToken);
}

function validatePackageAssetPath(assetPath) {
  const value = Array.isArray(assetPath) ? assetPath.join('/') : String(assetPath || '');
  if (!value || value.includes('\\') || value.startsWith('/')) {
    throw new FileStorageError('STORAGE_PATH_INVALID', 'Package asset path is invalid', 422);
  }
  const normalized = path.posix.normalize(value);
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw new FileStorageError('STORAGE_PATH_INVALID', 'Package asset path is invalid', 422);
  }
  return normalized;
}

function packageEntryPath(locator) {
  if (typeof locator !== 'string') return null;
  if (locator.startsWith('/packages/')) {
    const segments = locator.slice('/packages/'.length).split('/').filter(Boolean);
    return segments.length >= 2 ? segments.slice(1).join('/') : null;
  }
  const key = storageKeyFromLocator(locator);
  if (!key?.startsWith('packages/')) return null;
  const segments = key.split('/');
  return segments.length >= 3 ? segments.slice(2).join('/') : null;
}

async function openPackageAsset(indexLocator, assetPath, options = {}) {
  const normalizedAssetPath = validatePackageAssetPath(assetPath);
  if (indexLocator?.startsWith('/packages/')) {
    const segments = indexLocator.slice('/packages/'.length).split('/').filter(Boolean);
    const packageName = segments[0];
    if (!packageName) throw new FileStorageError('STORAGE_LOCATOR_INVALID', 'Package reference is invalid', 422);
    const packageRoot = path.resolve(__dirname, '../public/packages', packageName);
    const candidate = path.resolve(packageRoot, ...normalizedAssetPath.split('/'));
    const relative = path.relative(packageRoot, candidate);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new FileStorageError('STORAGE_PATH_INVALID', 'Package asset path is invalid', 422);
    }
    let stat;
    try {
      stat = await fsp.lstat(candidate);
    } catch (error) {
      if (error.code === 'ENOENT') throw new FileStorageError('FILE_NOT_FOUND', 'Package asset was not found', 404);
      throw error;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new FileStorageError('FILE_NOT_FOUND', 'Package asset was not found', 404);
    }
    const [rootRealPath, fileRealPath] = await Promise.all([
      fsp.realpath(packageRoot),
      fsp.realpath(candidate),
    ]);
    const realRelative = path.relative(rootRealPath, fileRealPath);
    if (!realRelative || realRelative === '..' || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
      throw new FileStorageError('STORAGE_PATH_INVALID', 'Package asset path is invalid', 422);
    }
    const selectedRange = parseRange(options.range, stat.size);
    return {
      body: fs.createReadStream(candidate, selectedRange || undefined),
      contentLength: selectedRange ? selectedRange.end - selectedRange.start + 1 : stat.size,
      contentRange: selectedRange ? `bytes ${selectedRange.start}-${selectedRange.end}/${stat.size}` : null,
    };
  }

  const key = storageKeyFromLocator(indexLocator);
  if (!key?.startsWith('packages/')) {
    throw new FileStorageError('STORAGE_LOCATOR_INVALID', 'Package reference is invalid', 422);
  }
  const segments = key.split('/');
  if (segments.length < 3) throw new FileStorageError('STORAGE_LOCATOR_INVALID', 'Package reference is invalid', 422);
  const targetKey = `${segments.slice(0, 2).join('/')}/${normalizedAssetPath}`;
  const targetLocator = indexLocator.startsWith('r2://')
    ? r2Locator(targetKey)
    : `${R2_PUBLIC_URL.replace(/\/$/, '')}/${targetKey}`;
  return openStoredFile(targetLocator, options);
}

function packagePrefixFromLocator(locator) {
  const key = storageKeyFromLocator(locator);
  if (!key?.startsWith('packages/')) return null;
  const segments = key.split('/');
  return segments.length >= 2 ? `${segments[0]}/${segments[1]}/` : null;
}

const MIME_MAP = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.xsd': 'application/xml',
  '.dtd': 'application/xml-dtd',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.csv': 'text/csv'
};

class StorageValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageValidationError';
    this.code = 'STORAGE_PATH_INVALID';
    this.statusCode = 422;
  }
}

function isWithinRoot(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

async function validateDirectory(rootRealPath, directoryPath) {
  const stat = await fsp.lstat(directoryPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new StorageValidationError('Package upload contains a non-directory or symbolic-link directory');
  }

  const realPath = await fsp.realpath(directoryPath);
  if (!isWithinRoot(rootRealPath, realPath)) {
    throw new StorageValidationError('Package upload path escapes its source directory');
  }
  return realPath;
}

async function collectRegularFiles(rootRealPath, directoryPath, files = []) {
  const directoryRealPath = await validateDirectory(rootRealPath, directoryPath);
  const names = await fsp.readdir(directoryRealPath);

  for (const name of names) {
    const candidatePath = path.join(directoryRealPath, name);
    const stat = await fsp.lstat(candidatePath);
    if (stat.isSymbolicLink()) {
      throw new StorageValidationError('Package upload contains a symbolic link');
    }

    const realPath = await fsp.realpath(candidatePath);
    if (!isWithinRoot(rootRealPath, realPath)) {
      throw new StorageValidationError('Package upload path escapes its source directory');
    }

    if (stat.isDirectory()) {
      await collectRegularFiles(rootRealPath, realPath, files);
    } else if (stat.isFile()) {
      files.push({
        localPath: realPath,
        relativePath: path.relative(rootRealPath, realPath).split(path.sep).join('/')
      });
    } else {
      throw new StorageValidationError('Package upload contains a non-regular file');
    }
  }

  return files;
}

async function revalidateRegularFile(rootRealPath, file) {
  const stat = await fsp.lstat(file.localPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new StorageValidationError('Package upload contains a non-regular file');
  }

  const realPath = await fsp.realpath(file.localPath);
  if (!isWithinRoot(rootRealPath, realPath)) {
    throw new StorageValidationError('Package upload path escapes its source directory');
  }

  return { realPath, size: stat.size };
}

/**
 * Upload an entire local directory to Cloudflare R2 recursively.
 * @param {string} localDir - Path to the local directory
 * @param {string} s3FolderPrefix - The logical folder path in R2 (e.g. 'packages/lesson-123')
 * @returns {{url: string, keys: string[]}} Public prefix and uploaded keys for rollback
 */
async function uploadDirectoryToStorage(localDir, s3FolderPrefix) {
  requireR2Configuration(R2_PRIVATE_BUCKET);
  const rootStat = await fsp.lstat(localDir);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new StorageValidationError('Package upload source must be a regular directory');
  }

  const rootRealPath = await fsp.realpath(localDir);
  const files = await collectRegularFiles(rootRealPath, rootRealPath);
  const uploadedKeys = [];

  // Upload in parallel batches (e.g., 20 files at a time to prevent socket exhaustion)
  const BATCH_SIZE = 20;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(batch.map(async (file) => {
      const { realPath, size } = await revalidateRegularFile(rootRealPath, file);
      const ext = path.extname(realPath).toLowerCase();
      const mimeType = MIME_MAP[ext] || 'application/octet-stream';
      const key = `${s3FolderPrefix}/${file.relativePath}`;

      await s3.send(new PutObjectCommand({
        Bucket: R2_PRIVATE_BUCKET,
        Key: key,
        Body: fs.createReadStream(realPath),
        ContentLength: size,
        ContentType: mimeType,
      }));

      return key;
    }));

    for (const result of results) {
      if (result.status === 'fulfilled') uploadedKeys.push(result.value);
    }

    const failure = results.find((result) => result.status === 'rejected');
    if (failure) {
      await deleteStorageKeys(uploadedKeys, { privateBucket: true });
      throw failure.reason;
    }
  }

  return {
    url: r2Locator(s3FolderPrefix),
    keys: uploadedKeys,
    privateStorage: true,
  };
}

async function deleteStorageKeys(keys, { privateBucket = false } = {}) {
  if (!Array.isArray(keys) || keys.length === 0) return;
  const bucket = privateBucket ? R2_PRIVATE_BUCKET : R2_BUCKET;
  requireR2Configuration(bucket);
  await Promise.allSettled(keys.map((key) => s3.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }))));
}

module.exports = {
  FileStorageError,
  StorageValidationError,
  uploadToStorage,
  uploadPrivateFileToStorage,
  deleteStoredFile,
  deleteStoragePrefix,
  deleteStorageKeys,
  openPackageAsset,
  openStoredFile,
  packageEntryPath,
  packagePrefixFromLocator,
  r2Locator,
  storageKeyFromLocator,
  uploadDirectoryToStorage,
};
