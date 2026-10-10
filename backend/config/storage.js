const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
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
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

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

/**
 * Upload a local file stream to Cloudflare R2.
 * @param {string} localPath - Path to the local file
 * @param {string} folder - Logical folder (e.g. 'lesson-files')
 * @param {string} filePath - Filename inside folder
 * @param {string} mimeType - MIME type
 * @returns {string} Public URL
 */
async function uploadFileToStorage(localPath, folder, filePath, mimeType) {
  const key = `${folder}/${filePath}`;

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: fs.createReadStream(localPath),
    ContentType: mimeType,
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete a file from Cloudflare R2
 * @param {string} folder
 * @param {string} filePath
 */
async function deleteFromStorage(folder, filePath) {
  const key = `${folder}/${filePath}`;
  await s3.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  }));
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
        Bucket: R2_BUCKET,
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
      await deleteStorageKeys(uploadedKeys);
      throw failure.reason;
    }
  }

  return {
    url: `${R2_PUBLIC_URL}/${s3FolderPrefix}`,
    keys: uploadedKeys,
  };
}

async function deleteStorageKeys(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return;
  await Promise.allSettled(keys.map((key) => s3.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  }))));
}

module.exports = {
  StorageValidationError,
  uploadToStorage,
  uploadFileToStorage,
  deleteFromStorage,
  deleteStorageKeys,
  uploadDirectoryToStorage
};
