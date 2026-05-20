const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

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

/**
 * Upload an entire local directory to Cloudflare R2 recursively.
 * @param {string} localDir - Path to the local directory
 * @param {string} s3FolderPrefix - The logical folder path in R2 (e.g. 'packages/lesson-123')
 * @returns {string} Public URL of the uploaded folder prefix
 */
async function uploadDirectoryToStorage(localDir, s3FolderPrefix) {
  const fsp = require('fs/promises');
  const path = require('path');
  
  async function getFiles(dir) {
    const dirents = await fsp.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
  }

  const files = await getFiles(localDir);

  // Upload in parallel batches (e.g., 20 files at a time to prevent socket exhaustion)
  const BATCH_SIZE = 20;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_MAP[ext] || 'application/octet-stream';
      
      const relativePath = path.relative(localDir, filePath).split(path.sep).join('/');
      const key = `${s3FolderPrefix}/${relativePath}`;
      
      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: mimeType,
      }));
    }));
  }

  return `${R2_PUBLIC_URL}/${s3FolderPrefix}`;
}

module.exports = { uploadToStorage, uploadFileToStorage, deleteFromStorage, uploadDirectoryToStorage };
