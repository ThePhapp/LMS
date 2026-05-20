# 📦 ZIP Package Upload & Viewer System

## 🎯 Tính Năng

Hệ thống cho phép giáo viên upload file `.zip` chứa web/package export (Figma prototype, HTML5 app, React app, v.v.) để dùng làm bài giảng trực tuyến interactive.

### ✨ Capabilities
- ✅ Upload file ZIP (max 500MB)
- ✅ Tự động kiểm tra `index.html`
- ✅ Giải nén vào thư mục `public/packages`
- ✅ Tạo link chạy tự động
- ✅ Hiển thị bằng iframe hoặc redirect
- ✅ Xóa tự động khi delete lesson
- ✅ Sandbox security

## 🏗️ Architecture

```
Upload (.zip)
    ↓
[Validation] - Check .zip extension
    ↓
[Extraction] - Extract to public/packages/lesson-{id}/
    ↓
[Verification] - Find index.html
    ↓
[Storage] - Save to DB with file_type='package'
    ↓
[Serving] - Static file server at /packages
    ↓
[Display] - PackageViewer iframe/redirect
```

## 📁 Files Created

### Backend

| File | Purpose |
|------|---------|
| `backend/utils/zipHandler.js` | ZIP extraction logic & utilities |
| `backend/controllers/lessonController.js` | Updated to handle ZIP files |
| `backend/routes/lessons.js` | Updated to accept .zip files |
| `backend/server.js` | Added /packages static route |
| `backend/package.json` | Added extract-zip dependency |
| `backend/ZIP_PACKAGE_HANDLER.md` | Detailed documentation |
| `backend/test-zip-handler.js` | Test script |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/components/PackageViewer.jsx` | React component for displaying packages |

### Documentation

| File | Purpose |
|------|---------|
| `PACKAGE_VIEWER_INTEGRATION.md` | Integration examples |
| `README.md` | This file |

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

This installs `extract-zip` (already added to package.json).

### 2. Ensure Directories Exist

```bash
mkdir -p backend/public/packages
mkdir -p backend/utils
```

### 3. Files Already Updated

- ✅ `backend/lessonController.js` - ZIP handling logic
- ✅ `backend/routes/lessons.js` - .zip file type allowed
- ✅ `backend/server.js` - /packages route configured
- ✅ `backend/package.json` - extract-zip dependency added

### 4. Test Installation

```bash
cd backend
node test-zip-handler.js
```

## 💻 Usage

### Backend - Create Lesson with Package

```javascript
// POST /api/lessons
const formData = new FormData();
formData.append('course_id', 1);
formData.append('chapter_id', 1);
formData.append('title', 'Interactive UI Mockup');
formData.append('content', 'Click around to explore...');
formData.append('file', zipFile);

const response = await fetch('/api/lessons', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  body: formData
});

// Response:
// {
//   id: 123,
//   file_type: "package",
//   file_url: "/packages/lesson-1234567890/index.html",
//   package_url: "/packages/lesson-1234567890/index.html"
// }
```

### Frontend - Display Package

```jsx
import PackageViewer from './components/PackageViewer';

function LessonView({ lesson }) {
  if (lesson.file_type === 'package') {
    return (
      <PackageViewer
        lessonId={lesson.id}
        fileName={lesson.file_name}
        packageUrl={lesson.file_url}
        inline={true}
      />
    );
  }
}
```

## 📋 API Endpoints

### POST /api/lessons
Create lesson with ZIP package

```
Headers: 
  - Authorization: Bearer {token}
  - Content-Type: multipart/form-data

Form Data:
  - course_id: number (required)
  - chapter_id: number (optional)
  - title: string (required)
  - content: string (optional)
  - file: File (.zip, required)

Response:
  - id: number
  - file_type: "package"
  - file_url: "/packages/lesson-{id}/index.html"
  - package_url: "/packages/lesson-{id}/index.html"
```

### PUT /api/lessons/:id
Update lesson with new package

```
Headers: 
  - Authorization: Bearer {token}
  - Content-Type: multipart/form-data

Form Data:
  - file: File (.zip, optional)

Response:
  - message: "Lesson updated"
  - package_url: "/packages/lesson-{id}/index.html"
```

### DELETE /api/lessons/:id
Delete lesson and package folder

```
Headers: 
  - Authorization: Bearer {token}

Response:
  - message: "Lesson deleted"
  
Note: Automatically cleans up /packages folder
```

### GET /api/lessons/:lessonId/package-info
Get package information

```
Headers: 
  - Authorization: Bearer {token}

Response:
  - packageUrl: "/packages/lesson-{id}/index.html"
  - fileName: "mypackage.zip"
  - canEmbed: true
  - openMethod: "iframe"
```

## 🎨 PackageViewer Component

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `lessonId` | number | - | Lesson ID for fetching package info |
| `fileName` | string | - | Display name of package |
| `packageUrl` | string | - | Direct URL to package (fallback) |
| `inline` | boolean | false | Display as inline iframe if true |

### Modes

**Card Mode** (default)
```jsx
<PackageViewer 
  lessonId={lesson.id}
  fileName={lesson.file_name}
/>
```

**Inline Mode** (embedded iframe)
```jsx
<PackageViewer 
  lessonId={lesson.id}
  fileName={lesson.file_name}
  packageUrl={lesson.file_url}
  inline={true}
/>
```

**Features:**
- 📱 Fullscreen mode
- 🔗 Open in new tab
- 🎯 Direct iframe embedding
- 🛡️ Sandbox security
- ⚡ Lazy loading

## 📂 Directory Structure

```
backend/
├── public/
│   ├── packages/                    # Extracted packages
│   │   ├── lesson-1234567890/
│   │   │   ├── index.html          # Entry point
│   │   │   ├── css/
│   │   │   ├── js/
│   │   │   └── assets/
│   │   └── lesson-1234567891/
│   │       └── index.html
│
├── utils/
│   └── zipHandler.js               # Extraction utils
│
├── controllers/
│   └── lessonController.js          # Updated
│
├── routes/
│   └── lessons.js                   # Updated
│
├── server.js                        # Updated
└── package.json                     # Updated
```

## ✅ Validation

### ZIP File Requirements

- **Extension:** Must be `.zip`
- **Size:** Max 500MB
- **Content:** Must contain `index.html` (root or nested)

### index.html Search

- Searches recursively from root
- Finds index.html in subdirectories
- Required for successful extraction

### Error Handling

| Error | Solution |
|-------|----------|
| "No index.html found" | Ensure ZIP contains index.html |
| "File type not allowed" | Upload as .zip file only |
| "File too large" | Max 500MB, compress or split |
| "Extraction failed" | ZIP might be corrupted, re-export |

## 🔒 Security

### Iframe Sandbox
```html
<iframe sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals">
```

**Allowed:**
- Scripts (JavaScript)
- Forms
- Popups
- Same-origin requests

**Blocked:**
- Top-level navigation
- Plugins
- External domain access (CORS required)

### CORS Headers
```javascript
X-Frame-Options: SAMEORIGIN
Access-Control-Allow-Origin: *
```

## 🧪 Testing

### Manual Test

1. **Create Test ZIP**
   - Create folder with index.html
   - Add CSS, JS, assets as needed
   - Zip it up

2. **Upload via API**
   ```bash
   curl -X POST http://localhost:5000/api/lessons \
     -H "Authorization: Bearer {token}" \
     -F "course_id=1" \
     -F "chapter_id=1" \
     -F "title=Test Package" \
     -F "file=@test.zip"
   ```

3. **Verify Package**
   - Check database: `file_type = 'package'`
   - Check folder: `backend/public/packages/lesson-{id}/`
   - Check files: `index.html` present

4. **Test Access**
   - Browser: `http://localhost:5000/packages/lesson-{id}/index.html`
   - Should display package content

### Automated Test

```bash
cd backend
node test-zip-handler.js
```

## 📚 Examples

### Example 1: Figma Prototype

1. Export Figma prototype as HTML
2. Download ZIP file
3. Upload to lesson
4. Package served at `/packages/lesson-xyz/index.html`
5. Display in iframe

### Example 2: React App

1. Build React app: `npm run build`
2. Zip `build/` folder
3. Upload as package
4. All JS/CSS bundled and working

### Example 3: Custom HTML5 App

```
myapp.zip
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── assets/
    ├── image.png
    └── data.json
```

Upload and display in iframe!

## 🐛 Troubleshooting

### Package not appearing

**Check:**
1. File uploaded successfully (check API response)
2. Folder exists: `backend/public/packages/lesson-{id}/`
3. index.html exists at: `backend/public/packages/lesson-{id}/index.html`
4. File permissions correct

**Fix:**
```bash
ls -la backend/public/packages/
chmod -R 755 backend/public/packages/
```

### Iframe not loading

**Check:**
1. CORS headers set correctly
2. X-Frame-Options not blocking
3. Sandbox attributes sufficient

**Fix:**
- Verify server.js has /packages route with correct headers
- Test direct URL: `http://localhost:5000/packages/lesson-{id}/index.html`

### Package files not found

**Check:**
1. ZIP actually contains the files
2. Extraction completed successfully
3. Check test output

**Fix:**
```bash
unzip -l backend/public/packages/lesson-{id}/
# Should show all files
```

## 🎓 Learning Path

1. **Setup** - Install extract-zip
2. **Backend** - Understand zipHandler utils
3. **API** - Test endpoints with curl/Postman
4. **Frontend** - Integrate PackageViewer component
5. **Testing** - Run test-zip-handler.js
6. **Deploy** - Move to production

## 📖 Documentation Files

- **Backend:**
  - `backend/ZIP_PACKAGE_HANDLER.md` - Detailed backend docs
  - `backend/utils/zipHandler.js` - Function documentation

- **Frontend:**
  - `PACKAGE_VIEWER_INTEGRATION.md` - Component usage guide
  - `frontend/src/components/PackageViewer.jsx` - Component source

## 🚀 Next Steps

1. ✅ Files created - Ready to use
2. ⏳ Run `npm install` in backend
3. ⏳ Test with `npm run test-zip-handler.js`
4. ⏳ Integrate PackageViewer in CourseLearning.jsx
5. ⏳ Test with real ZIP files

## 📞 Support

If you have issues:

1. Check [Troubleshooting](#-troubleshooting) section
2. Read `ZIP_PACKAGE_HANDLER.md` for detailed info
3. Run test script: `npm run test-zip-handler.js`
4. Check browser console for errors
5. Check server logs: `npm run dev`

## 📄 License

Part of LMS - Lớp Học Đổi Mới Project

---

**Version:** 1.0  
**Last Updated:** May 2026
