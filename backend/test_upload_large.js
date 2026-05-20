const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Create a 79MB dummy file
const dummyFilePath = path.join(__dirname, 'dummy.zip');
console.log('Creating 79MB dummy zip file...');
// We need a valid zip so it doesn't fail at extraction immediately, or we can just let it fail at extraction and see if the upload completes.
// Since we want to test network upload, a dummy file is fine.
const buffer = Buffer.alloc(79 * 1024 * 1024, 'a');
fs.writeFileSync(dummyFilePath, buffer);

console.log('Sending request to localhost:5000...');

// No form-data
// Wait, we don't have form-data installed maybe. Let's use curl.

try {
  const result = execSync(`curl -X POST -H "authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OSwicm9sZSI6ImxlY3R1cmVyIiwiaWF0IjoxNzc5Mjc5MDYzLCJleHAiOjE3ODE4NzEwNjN9.uCAEIENYH-Ap-5Z6j9S9tE0NMoDHVdCdRUSSn22eooE" -F "course_id=1" -F "title=Test" -F "file=@${dummyFilePath}" http://localhost:5000/api/lessons -v`);
  console.log(result.toString());
} catch (error) {
  console.error("Curl error:", error.message);
  if (error.stdout) console.log(error.stdout.toString());
  if (error.stderr) console.log(error.stderr.toString());
}
