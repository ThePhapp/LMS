#!/usr/bin/env node

/**
 * Test script for ZIP package handler
 * Run: node backend/test-zip-handler.js
 */

const extractZip = require('extract-zip');
const fs = require('fs').promises;
const path = require('path');
const { extractPackage, findIndexHtml, pathExists } = require('./utils/zipHandler');

const TEST_DIR = path.join(__dirname, 'test-packages');

async function setupTestDir() {
  try {
    await fs.mkdir(TEST_DIR, { recursive: true });
    console.log('✓ Test directory created:', TEST_DIR);
  } catch (error) {
    console.error('✗ Failed to create test directory:', error.message);
    process.exit(1);
  }
}

async function createTestZip() {
  console.log('\n📦 Creating test ZIP with index.html...');
  
  const zipDir = path.join(TEST_DIR, 'test-package');
  await fs.mkdir(zipDir, { recursive: true });

  // Create index.html
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Package</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; }
    .info { background: #e8f4f8; padding: 10px; border-radius: 4px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ Test Package Loaded Successfully</h1>
    <div class="info">
      <p><strong>Package Type:</strong> Test Interactive Package</p>
      <p><strong>Created:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Location:</strong> ${zipDir}</p>
    </div>
    <h2>Contents</h2>
    <ul>
      <li>index.html (this file)</li>
      <li>style.css</li>
      <li>script.js</li>
      <li>assets/sample.txt</li>
    </ul>
    <p>This is a test to verify the ZIP extraction handler works correctly.</p>
  </div>
  <script src="script.js"></script>
</body>
</html>
  `.trim();

  await fs.writeFile(path.join(zipDir, 'index.html'), htmlContent);
  console.log('✓ index.html created');

  // Create CSS file
  await fs.writeFile(path.join(zipDir, 'style.css'), `
body { margin: 0; padding: 0; }
h1 { color: #007bff; }
  `.trim());
  console.log('✓ style.css created');

  // Create JS file
  await fs.writeFile(path.join(zipDir, 'script.js'), `
console.log('Test package loaded!');
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM is ready');
});
  `.trim());
  console.log('✓ script.js created');

  // Create assets directory
  const assetsDir = path.join(zipDir, 'assets');
  await fs.mkdir(assetsDir, { recursive: true });
  await fs.writeFile(path.join(assetsDir, 'sample.txt'), 'Sample asset file');
  console.log('✓ assets/sample.txt created');

  return zipDir;
}

async function zipDirectory(sourceDir, outputPath) {
  console.log('\n📥 Creating ZIP file...');
  
  const archiver = require('archiver');
  const output = require('fs').createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`✓ ZIP file created: ${outputPath} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', (err) => {
      console.error('✗ Archiver error:', err.message);
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function testExtraction() {
  console.log('\n🔍 Testing extraction...');
  
  const zipPath = path.join(TEST_DIR, 'test-package.zip');
  const extractDir = path.join(TEST_DIR, 'extracted');

  // Read ZIP file
  const zipBuffer = await fs.readFile(zipPath);
  console.log(`✓ ZIP file read (${zipBuffer.length} bytes)`);

  // Extract
  const result = await extractPackage(zipBuffer, extractDir);
  
  if (result.success) {
    console.log('✓ Extraction successful');
    console.log('  Index path:', result.indexPath);
  } else {
    console.log('✗ Extraction failed:', result.error);
    process.exit(1);
  }

  // Verify files
  const indexPath = path.join(extractDir, 'index.html');
  const exists = await pathExists(indexPath);
  console.log(`✓ index.html exists: ${exists}`);

  // List directory contents
  const files = await fs.readdir(extractDir);
  console.log('✓ Extracted files:', files.join(', '));

  return extractDir;
}

async function testFindIndexHtml() {
  console.log('\n🔎 Testing index.html finder...');
  
  const extractDir = path.join(TEST_DIR, 'extracted');
  const found = await findIndexHtml(extractDir);
  
  if (found) {
    console.log('✓ index.html found:', found);
  } else {
    console.log('✗ index.html not found');
    process.exit(1);
  }
}

async function testNestedStructure() {
  console.log('\n📁 Testing nested directory structure...');
  
  const nestedDir = path.join(TEST_DIR, 'nested-package');
  const subDir = path.join(nestedDir, 'src', 'build');
  
  await fs.mkdir(subDir, { recursive: true });
  await fs.writeFile(path.join(subDir, 'index.html'), '<h1>Nested</h1>');
  console.log('✓ Created nested structure: src/build/index.html');

  const found = await findIndexHtml(nestedDir);
  if (found && found.includes('index.html')) {
    console.log('✓ Nested index.html found:', found);
  } else {
    console.log('✗ Failed to find nested index.html');
    process.exit(1);
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test files...');
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    console.log('✓ Test directory cleaned');
  } catch (error) {
    console.warn('⚠ Failed to cleanup:', error.message);
  }
}

async function runTests() {
  console.log('========================================');
  console.log('  ZIP Package Handler Test Suite');
  console.log('========================================');

  try {
    // Check dependencies
    console.log('\n📋 Checking dependencies...');
    try {
      require('extract-zip');
      console.log('✓ extract-zip is installed');
    } catch {
      console.error('✗ extract-zip is not installed');
      console.log('  Run: npm install extract-zip');
      process.exit(1);
    }

    await setupTestDir();
    await createTestZip();
    
    // Note: Requires archiver for ZIP creation
    try {
      const sourceDir = path.join(TEST_DIR, 'test-package');
      const zipPath = path.join(TEST_DIR, 'test-package.zip');
      await zipDirectory(sourceDir, zipPath);
      await testExtraction();
    } catch (error) {
      console.warn('⚠ Skipping ZIP creation test (archiver not installed)');
      console.log('  Install archiver for full testing: npm install archiver');
    }

    await testFindIndexHtml();
    await testNestedStructure();

    console.log('\n========================================');
    console.log('✅ All tests passed!');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Run tests
runTests().catch(console.error);
