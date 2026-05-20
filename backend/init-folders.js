#!/usr/bin/env node

/**
 * Initialize required directories for LMS backend
 * Run: node init-folders.js
 */

const fs = require('fs');
const path = require('path');

const folders = [
  'public',
  'public/packages',
  'uploads',
  'uploads/tmp',
  'utils',
  'logs'
];

console.log('📁 Initializing backend directories...\n');

folders.forEach(folder => {
  const fullPath = path.join(__dirname, folder);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created: ${folder}`);
  } else {
    console.log(`✓ Exists: ${folder}`);
  }
});

console.log('\n✅ All directories initialized!\n');
