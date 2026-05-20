# 📦 ZIP Package Upload Handler - Hướng Dẫn

## Tổng Quan

Hệ thống hỗ trợ upload file `.zip` chứa web/package export (như Figma prototype, web package, v.v.) để dùng làm bài giảng trực tuyến.

## Quy Trình

### 1. **Upload Package ZIP**

**Frontend:** Upload file `.zip` thông qua endpoint lesson creation/update

```javascript
const formData = new FormData();
formData.append('course_id', courseId);
formData.append('chapter_id', chapterId);
formData.append('title', 'My Interactive Package');
formData.append('content', 'Description...');
formData.append('file', zipFile); // File .zip

const response = await api.post('/api/lessons', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### 2. **Backend Processing**

#### A. File Validation
- Check file extension is `.zip`
- Check file size (max 500MB)
- Extract MIME type validation

#### B. ZIP Extraction
- Create temp directory: `backend/public/packages/lesson-{timestamp}`
- Extract ZIP to this directory
- Search for `index.html` recursively
- If not found, reject upload with error message

#### C. Database Storage
- Save lesson with:
  - `file_type`: `'package'`
  - `file_url`: `/packages/lesson-{timestamp}/index.html`
  - `file_name`: Original filename
- Return `package_url` to frontend

#### D. Cleanup
- Delete temporary ZIP file after extraction
- Keep extracted files for serving

### 3. **Frontend Display**

#### Option 1: Using PackageViewer Component

```jsx
import PackageViewer from '../components/PackageViewer';

<PackageViewer 
  lessonId={lesson.id}
  fileName={lesson.file_name}
  packageUrl={lesson.file_url}
  inline={true}
/>
```

**Props:**
- `lessonId`: Lesson ID for fetching package info
- `fileName`: Display name of package
- `packageUrl`: Direct URL to package (fallback)
- `inline`: Display as inline iframe (default: false for card view)

#### Option 2: Direct Redirect

```javascript
// Open package in new tab
window.open(lesson.file_url, '_blank');
```

#### Option 3: Embed in iFrame

```jsx
<iframe 
  src={packageUrl}
  style={{ width: '100%', height: '600px', border: 'none' }}
  title="Web Package"
  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
/>
```

## Directory Structure

```
backend/
├── public/
│   ├── packages/
│   │   ├── lesson-1234567890/
│   │   │   ├── index.html      ← Entry point
│   │   │   ├── css/
│   │   │   ├── js/
│   │   │   ├── assets/
│   │   │   └── ...
│   │   ├── lesson-1234567891/
│   │   └── ...
│
├── server.js                   ← Serves /packages route
└── ...
```

## API Endpoints

### Create Lesson with Package

```
POST /api/lessons
Content-Type: multipart/form-data

Form Data:
- course_id: number
- chapter_id: number
- title: string
- content: string (optional)
- file: File (.zip)

Response:
{
  "id": 123,
  "file_type": "package",
  "file_url": "/packages/lesson-1234567890/index.html",
  "file_name": "mypackage.zip",
  "package_url": "/packages/lesson-1234567890/index.html"
}
```

### Update Lesson with Package

```
PUT /api/lessons/:id
Content-Type: multipart/form-data

Form Data:
- title: string (optional)
- file: File (.zip, optional)

Response:
{
  "message": "Lesson updated",
  "package_url": "/packages/lesson-1234567890/index.html"
}
```

### Delete Lesson (with Package)

```
DELETE /api/lessons/:id

Response: { "message": "Lesson deleted" }

Note: Automatically cleans up package folder
```

### Get Package Info

```
GET /api/lessons/:lessonId/package-info

Response:
{
  "packageUrl": "/packages/lesson-1234567890/index.html",
  "fileName": "mypackage.zip",
  "canEmbed": true,
  "openMethod": "iframe"
}
```

## Validation Rules

### Index.html Check
- **Required:** Every ZIP must contain `index.html`
- **Search:** Recursive search from root and subdirectories
- **Error:** If not found, extraction fails and user gets error message

### File Size Limits
- **Maximum:** 500 MB per file
- **Typical:** 10-50 MB for web packages

### Supported Package Types
- ✅ Figma prototype exports
- ✅ HTML/CSS/JS web applications
- ✅ React single-page apps (bundled)
- ✅ Vue.js applications
- ✅ Angular applications
- ✅ Custom HTML5 applications
- ✅ Interactive presentations
- ✅ Mockup/prototype files

## Error Handling

### Common Errors

**"No index.html found in package"**
- ZIP must contain `index.html` at root or in subdirectory
- Solution: Extract ZIP locally, verify structure, re-zip

**"File type not allowed"**
- Only `.zip` files are accepted for packages
- Solution: Ensure correct file extension

**"Package extraction failed"**
- ZIP might be corrupted
- Solution: Try re-exporting package, ensure ZIP integrity

## Frontend Integration Example

```jsx
import PackageViewer from './components/PackageViewer';

function LessonContent({ lesson }) {
  if (lesson.file_type === 'package') {
    return (
      <div>
        <h3>{lesson.title}</h3>
        <p>{lesson.content}</p>
        
        <PackageViewer
          lessonId={lesson.id}
          fileName={lesson.file_name}
          packageUrl={lesson.file_url}
          inline={true}
        />
      </div>
    );
  }
  
  if (lesson.file_type === 'video') {
    return <video src={lesson.file_url} controls />;
  }
  
  if (lesson.file_type === 'pdf') {
    return <embed src={lesson.file_url} />;
  }
  
  return <div>{lesson.content}</div>;
}
```

## Utility Functions

### Backend Utils (`backend/utils/zipHandler.js`)

```javascript
// Extract package and validate
await extractPackage(zipBuffer, extractPath)

// Find index.html recursively
await findIndexHtml(dir)

// Generate package URL
getPackageUrl(packageId, indexPath)

// Clean up package folder
await cleanupPackage(packagePath)

// Check if path exists
await pathExists(path)
```

## Performance Considerations

1. **Extraction Speed:** Most packages extract in < 1 second
2. **Storage:** Use SSD for `public/packages` folder
3. **Cleanup:** Old packages are deleted when lesson is deleted
4. **Serving:** Static files served efficiently by Express
5. **Bandwidth:** Consider CDN for large packages

## Security

### Sandbox Restrictions

iframe includes `sandbox` attribute:
```html
<iframe 
  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
  ...
/>
```

**Allowed:**
- ✅ Scripts (JavaScript)
- ✅ Forms
- ✅ Popups
- ✅ Same-origin requests

**Blocked:**
- ❌ Top-level navigation
- ❌ Plugins
- ❌ Pointer lock
- ❌ External domain access (CORS required)

### CORS Headers

```javascript
// server.js - Enable iframe embedding
res.setHeader('X-Frame-Options', 'SAMEORIGIN');
res.setHeader('Access-Control-Allow-Origin', '*');
```

## Backup & Migration

### Export Lessons with Packages

```bash
# Backup packages folder
cp -r backend/public/packages backup/packages

# Export database
mysqldump lms_db lessons > backup/lessons.sql
```

### Restore

```bash
# Restore packages
cp -r backup/packages backend/public/packages

# Restore database
mysql lms_db < backup/lessons.sql
```

## Testing

### Test Cases

1. ✅ Upload valid ZIP with index.html
2. ✅ Upload invalid ZIP without index.html → Error
3. ✅ Update lesson with new package
4. ✅ Delete lesson → Package folder removed
5. ✅ Open package in iframe → Display correctly
6. ✅ Open package in new tab → Works
7. ✅ Large package (> 100MB) → Works (up to 500MB)

### Test URL

```bash
# Check if package is served correctly
curl http://localhost:5000/packages/lesson-1234567890/index.html

# Should return HTML content
```

## Future Enhancements

- [ ] Async ZIP extraction (handle large files better)
- [ ] Compress packages with gzip
- [ ] CDN integration for package serving
- [ ] Package preview generation
- [ ] Version control for packages
- [ ] Package analytics (usage tracking)
- [ ] Automatic virus scanning
- [ ] Package optimization (minify, optimize assets)
