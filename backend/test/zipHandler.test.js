const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const {
  ZIP_LIMITS,
  extractPackage,
  extractPackageFromFile
} = require('../utils/zipHandler');

const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function createExtraField(id, data) {
  const header = Buffer.alloc(4);
  header.writeUInt16LE(id, 0);
  header.writeUInt16LE(data.length, 2);
  return Buffer.concat([header, data]);
}

function createZip(entries) {
  const localRecords = [];
  const centralRecords = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data || '', 'utf8');
    const method = entry.method ?? 0;
    const compressedData = method === 8 ? zlib.deflateRawSync(data) : data;
    const compressedSize = entry.declaredCompressedSize ?? compressedData.length;
    const uncompressedSize = entry.declaredUncompressedSize ?? data.length;
    const extra = entry.extra || Buffer.alloc(0);
    const mode = entry.mode ?? (entry.name.endsWith('/') ? 0o040755 : 0o100644);
    const externalAttributes = ((mode & 0xffff) << 16) >>> 0;
    const flags = 0x0800;
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(flags, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(extra.length, 28);

    const localRecord = Buffer.concat([localHeader, name, extra, compressedData]);
    localRecords.push(localRecord);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE((3 << 8) | 20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(flags, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(extra.length, 30);
    centralHeader.writeUInt32LE(externalAttributes, 38);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralRecords.push(Buffer.concat([centralHeader, name, extra]));

    localOffset += localRecord.length;
  }

  const centralDirectory = Buffer.concat(centralRecords);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localOffset, 16);

  return Buffer.concat([...localRecords, centralDirectory, endRecord]);
}

async function makeTempDirectory(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'lms-zip-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

async function assertMissing(targetPath) {
  await assert.rejects(fs.lstat(targetPath), { code: 'ENOENT' });
}

test('extracts a valid nested web package and finds its index.html', async (t) => {
  const tempDirectory = await makeTempDirectory(t);
  const zipPath = path.join(tempDirectory, 'package.zip');
  const extractPath = path.join(tempDirectory, 'extracted');
  const archive = createZip([
    { name: 'course/index.html', data: '<!doctype html><script src="assets/app.js"></script>' },
    { name: 'course/assets/app.js', data: 'globalThis.packageLoaded = true;' },
    { name: 'course/assets/styles/main.css', data: 'body { color: #123; }' }
  ]);
  await fs.writeFile(zipPath, archive);

  const result = await extractPackageFromFile(zipPath, extractPath);

  assert.equal(result.success, true);
  assert.equal(result.indexPath, path.join(extractPath, 'course', 'index.html'));
  assert.equal(
    await fs.readFile(path.join(extractPath, 'course', 'assets', 'app.js'), 'utf8'),
    'globalThis.packageLoaded = true;'
  );
});

for (const unsafeName of ['../escaped.txt', '/absolute.txt', '..\\escaped.txt']) {
  test(`rejects unsafe ZIP path ${JSON.stringify(unsafeName)} and cleans extraction`, async (t) => {
    const tempDirectory = await makeTempDirectory(t);
    const extractPath = path.join(tempDirectory, 'extracted');
    const archive = createZip([
      { name: 'index.html', data: '<!doctype html>' },
      { name: unsafeName, data: 'escape' }
    ]);

    const result = await extractPackage(archive, extractPath);

    assert.equal(result.success, false);
    assert.equal(result.statusCode, 422);
    assert.equal(result.code, 'ZIP_PATH_INVALID');
    await assertMissing(extractPath);
    await assertMissing(path.join(tempDirectory, 'escaped.txt'));
  });
}

test('rejects a Unix symlink entry before extraction', async (t) => {
  const tempDirectory = await makeTempDirectory(t);
  const extractPath = path.join(tempDirectory, 'extracted');
  const archive = createZip([
    { name: 'index.html', data: '<!doctype html>' },
    { name: 'assets/latest', data: '../index.html', mode: 0o120777 }
  ]);

  const result = await extractPackage(archive, extractPath);

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 422);
  assert.equal(result.code, 'ZIP_ENTRY_TYPE_INVALID');
  await assertMissing(extractPath);
});

test('rejects legacy Unix hard-link metadata before extraction', async (t) => {
  const tempDirectory = await makeTempDirectory(t);
  const extractPath = path.join(tempDirectory, 'extracted');
  const asiUnixData = Buffer.alloc(14 + Buffer.byteLength('index.html'));
  asiUnixData.writeUInt16LE(0o100644, 4);
  asiUnixData.write('index.html', 14);
  const archive = createZip([
    { name: 'index.html', data: '<!doctype html>' },
    {
      name: 'assets/duplicate.html',
      data: '',
      extra: createExtraField(0x756e, asiUnixData)
    }
  ]);

  const result = await extractPackage(archive, extractPath);

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 422);
  assert.equal(result.code, 'ZIP_ENTRY_TYPE_INVALID');
  await assertMissing(extractPath);
});

test('rejects a Unix device entry before extraction', async (t) => {
  const tempDirectory = await makeTempDirectory(t);
  const extractPath = path.join(tempDirectory, 'extracted');
  const archive = createZip([
    { name: 'index.html', data: '<!doctype html>' },
    { name: 'assets/device', data: '', mode: 0o020666 }
  ]);

  const result = await extractPackage(archive, extractPath);

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 422);
  assert.equal(result.code, 'ZIP_ENTRY_TYPE_INVALID');
  await assertMissing(extractPath);
});

test('rejects oversized uncompressed metadata before writing files', async (t) => {
  const tempDirectory = await makeTempDirectory(t);
  const extractPath = path.join(tempDirectory, 'extracted');
  const archive = createZip([
    { name: 'index.html', data: '<!doctype html>' },
    {
      name: 'assets/bomb.bin',
      data: '',
      method: 8,
      declaredUncompressedSize: ZIP_LIMITS.maxFileBytes + 1
    }
  ]);

  const result = await extractPackage(archive, extractPath);

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 413);
  assert.equal(result.code, 'ZIP_FILE_TOO_LARGE');
  await assertMissing(extractPath);
});

test('requires index.html and removes the failed extraction directory', async (t) => {
  const tempDirectory = await makeTempDirectory(t);
  const extractPath = path.join(tempDirectory, 'extracted');
  const archive = createZip([{ name: 'course/start.html', data: '<!doctype html>' }]);

  const result = await extractPackage(archive, extractPath);

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 422);
  assert.equal(result.code, 'ZIP_INDEX_REQUIRED');
  await assertMissing(extractPath);
});
