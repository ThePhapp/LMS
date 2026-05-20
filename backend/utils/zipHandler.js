const fs = require('fs').promises;
const path = require('path');
let extractZip;

try {
  extractZip = require('extract-zip');
} catch (err) {
  console.warn('extract-zip not installed, package upload will be disabled');
}

/**
 * Extract ZIP file and validate it contains index.html
 * @param {Buffer} zipBuffer - ZIP file buffer
 * @param {string} extractPath - Destination path
 * @returns {Promise<{success: boolean, indexPath: string, error: string}>}
 */
async function extractPackage(zipBuffer, extractPath) {
  try {
    if (!extractZip) {
      throw new Error('extract-zip module not available. Run: npm install extract-zip');
    }

    // Ensure directory exists
    await fs.mkdir(extractPath, { recursive: true });

    // Save buffer to temp file
    const tempZipPath = path.join(extractPath, `temp-${Date.now()}.zip`);
    await fs.writeFile(tempZipPath, zipBuffer);

    // Extract ZIP
    await extractZip(tempZipPath, { dir: extractPath });

    // Delete temp ZIP
    await fs.unlink(tempZipPath);

    // Check for index.html
    const indexPath = await findIndexHtml(extractPath);

    if (!indexPath) {
      throw new Error('No index.html found in package');
    }

    return {
      success: true,
      indexPath: indexPath,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      indexPath: null,
      error: error.message
    };
  }
}

/**
 * Extract ZIP file from disk and validate it contains index.html.
 * @param {string} zipPath - ZIP file path
 * @param {string} extractPath - Destination path
 * @returns {Promise<{success: boolean, indexPath: string, error: string}>}
 */
async function extractPackageFromFile(zipPath, extractPath) {
  try {
    if (!extractZip) {
      throw new Error('extract-zip module not available. Run: npm install extract-zip');
    }

    await fs.mkdir(extractPath, { recursive: true });
    await extractZip(zipPath, { dir: extractPath });

    const hasDangerous = await scanDangerousFiles(extractPath);
    if (hasDangerous) {
      throw new Error('Package contains prohibited dangerous files (.exe, .bat, .sh, .php, etc.)');
    }

    const indexPath = await findIndexHtml(extractPath);

    if (!indexPath) {
      throw new Error('No index.html found in package');
    }

    return {
      success: true,
      indexPath: indexPath,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      indexPath: null,
      error: error.message
    };
  }
}

/**
 * Find index.html recursively
 * @param {string} dir - Directory to search
 * @returns {Promise<string|null>} - Relative path to index.html or null
 */

/**
 * Find index.html recursively
 * @param {string} dir - Directory to search
 * @returns {Promise<string|null>} - Relative path to index.html or null
 */
async function findIndexHtml(dir) {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.name === 'index.html') {
        return fullPath; // Return absolute path
      }

      if (file.isDirectory() && !file.name.startsWith('.')) {
        const found = await findIndexHtml(fullPath);
        if (found) return found;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Scan for dangerous file extensions
 * @param {string} dir - Directory to search
 * @returns {Promise<boolean>} - True if dangerous files exist
 */
async function scanDangerousFiles(dir) {
  try {
    const dangerousExts = ['.exe', '.bat', '.cmd', '.sh', '.php'];
    const files = await fs.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory() && !file.name.startsWith('.')) {
        const found = await scanDangerousFiles(fullPath);
        if (found) return true;
      } else {
        const ext = path.extname(file.name).toLowerCase();
        if (dangerousExts.includes(ext)) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Get relative URL path for package
 * @param {string} packageId - Lesson/Package ID
 * @param {string} indexPath - Absolute path to index.html
 * @returns {string} - URL path like /packages/lesson-123/index.html
 */
function getPackageUrl(packageId, indexPath) {
  const baseDir = path.join(__dirname, '../public/packages');
  const relativePath = path.relative(baseDir, indexPath).split(path.sep).join('/');
  const packageDir = path.posix.dirname(relativePath);
  return `/packages/${packageDir}/index.html`;
}

/**
 * Clean up old package files
 * @param {string} packagePath - Path to package folder
 */
async function cleanupPackage(packagePath) {
  try {
    if (await pathExists(packagePath)) {
      await fs.rm(packagePath, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Error cleaning package:', error);
  }
}

/**
 * Check if path exists
 * @param {string} p - Path to check
 * @returns {Promise<boolean>}
 */
async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  extractPackage,
  extractPackageFromFile,
  findIndexHtml,
  getPackageUrl,
  cleanupPackage,
  pathExists
};
