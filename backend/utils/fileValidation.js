const fs = require('fs/promises');
const path = require('path');

const FILE_POLICIES = Object.freeze({
  '.pdf': { mime: 'application/pdf', signature: 'pdf' },
  '.doc': { mime: 'application/msword', signature: 'ole' },
  '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', signature: 'zip' },
  '.ppt': { mime: 'application/vnd.ms-powerpoint', signature: 'ole' },
  '.pptx': { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', signature: 'zip' },
  '.xls': { mime: 'application/vnd.ms-excel', signature: 'ole' },
  '.xlsx': { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', signature: 'zip' },
  '.txt': { mime: 'text/plain; charset=utf-8', signature: 'text' },
  '.csv': { mime: 'text/csv; charset=utf-8', signature: 'text' },
  '.jpg': { mime: 'image/jpeg', signature: 'jpeg' },
  '.jpeg': { mime: 'image/jpeg', signature: 'jpeg' },
  '.png': { mime: 'image/png', signature: 'png' },
  '.gif': { mime: 'image/gif', signature: 'gif' },
  '.webp': { mime: 'image/webp', signature: 'webp' },
  '.mp4': { mime: 'video/mp4', signature: 'iso-media' },
  '.mov': { mime: 'video/quicktime', signature: 'iso-media' },
  '.webm': { mime: 'video/webm', signature: 'ebml' },
  '.mkv': { mime: 'video/x-matroska', signature: 'ebml' },
  '.avi': { mime: 'video/x-msvideo', signature: 'avi' },
  '.mp3': { mime: 'audio/mpeg', signature: 'mp3' },
  '.wav': { mime: 'audio/wav', signature: 'wav' },
  '.zip': { mime: 'application/zip', signature: 'zip' },
});

const CONTEXT_EXTENSIONS = Object.freeze({
  assignment: new Set(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.csv', '.jpg', '.jpeg', '.png']),
  image: new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']),
  lesson: new Set(Object.keys(FILE_POLICIES)),
});

const DOWNLOAD_MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.webmanifest': 'application/manifest+json',
});

class FileValidationError extends Error {
  constructor(code, message, statusCode = 415) {
    super(message);
    this.name = 'FileValidationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function startsWith(buffer, bytes) {
  return buffer.length >= bytes.length && bytes.every((byte, index) => buffer[index] === byte);
}

function ascii(buffer, start, end) {
  return buffer.subarray(start, end).toString('ascii');
}

function matchesSignature(buffer, signature) {
  switch (signature) {
    case 'pdf': return ascii(buffer, 0, 5) === '%PDF-';
    case 'ole': return startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case 'zip': return startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])
      || startsWith(buffer, [0x50, 0x4b, 0x05, 0x06])
      || startsWith(buffer, [0x50, 0x4b, 0x07, 0x08]);
    case 'jpeg': return startsWith(buffer, [0xff, 0xd8, 0xff]);
    case 'png': return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'gif': return ascii(buffer, 0, 6) === 'GIF87a' || ascii(buffer, 0, 6) === 'GIF89a';
    case 'webp': return ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WEBP';
    case 'iso-media': return ascii(buffer, 4, 8) === 'ftyp';
    case 'ebml': return startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3]);
    case 'avi': return ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'AVI ';
    case 'wav': return ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WAVE';
    case 'mp3': return ascii(buffer, 0, 3) === 'ID3'
      || (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
    case 'text': {
      if (buffer.includes(0)) return false;
      const decoded = buffer.toString('utf8');
      const replacements = [...decoded].filter((character) => character === '\uFFFD').length;
      return replacements <= Math.max(1, Math.floor(decoded.length * 0.01));
    }
    default: return false;
  }
}

async function readHeader(filePath, length = 8192) {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function validateContent(buffer, originalName, context) {
  const extension = path.extname(originalName || '').toLowerCase();
  const allowedExtensions = CONTEXT_EXTENSIONS[context];
  const policy = FILE_POLICIES[extension];

  if (!allowedExtensions || !policy || !allowedExtensions.has(extension)) {
    throw new FileValidationError('FILE_TYPE_NOT_ALLOWED', 'File type is not allowed');
  }

  if (!buffer.length || !matchesSignature(buffer, policy.signature)) {
    throw new FileValidationError(
      'FILE_TYPE_MISMATCH',
      'File content does not match its extension',
    );
  }

  return { extension, mimeType: policy.mime };
}

async function validateUploadedFile(filePath, originalName, context = 'lesson') {
  return validateContent(await readHeader(filePath), originalName, context);
}

function validateUploadedBuffer(buffer, originalName, context = 'image') {
  if (!Buffer.isBuffer(buffer)) {
    throw new FileValidationError('FILE_INVALID', 'Uploaded file is invalid', 400);
  }
  return validateContent(buffer.subarray(0, 8192), originalName, context);
}

function mimeTypeForName(fileName) {
  const extension = path.extname(fileName || '').toLowerCase();
  return FILE_POLICIES[extension]?.mime
    || DOWNLOAD_MIME_TYPES[extension]
    || 'application/octet-stream';
}

module.exports = {
  CONTEXT_EXTENSIONS,
  FILE_POLICIES,
  FileValidationError,
  mimeTypeForName,
  validateUploadedBuffer,
  validateUploadedFile,
};
