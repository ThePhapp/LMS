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

module.exports = { uploadToStorage, uploadFileToStorage, deleteFromStorage };
