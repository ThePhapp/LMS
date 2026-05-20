# 🔧 Fix lỗi NET::ERR_CONNECTION_RESET khi upload bài học

## ❌ Lỗi

```
POST http://localhost:5000/api/lessons net::ERR_CONNECTION_RESET
```

## ✅ Nguyên Nhân & Giải Pháp

### 1. **Cài đặt extract-zip** (Chính)
```bash
cd backend
npm install extract-zip
```

### 2. **Tạo thư mục cần thiết**
```bash
node init-folders.js
```

Hoặc tạo thủ công:
```bash
mkdir -p backend/public/packages
mkdir -p backend/uploads
```

### 3. **Kiểm tra Backend chạy**
```bash
cd backend
npm run dev
# Hoặc
node server.js
```

Nên thấy output:
```
✓ Server running on port 5000
✓ Database connected
```

### 4. **Check file permissions** (Linux/Mac)
```bash
chmod -R 755 backend/public
chmod -R 755 backend/uploads
```

## 🧪 Test

### Cách 1: Test API bằng curl
```bash
# Test API server
curl http://localhost:5000/api/health

# Should return: { "status": "ok" }
```

### Cách 2: Test upload file
```bash
# Tạo test ZIP file
zip test.zip index.html

# Upload
curl -X POST http://localhost:5000/api/lessons \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "course_id=1" \
  -F "chapter_id=1" \
  -F "title=Test Package" \
  -F "content=Test Description" \
  -F "file=@test.zip"
```

## 📋 Checklist

- [ ] Cài `npm install extract-zip` trong backend
- [ ] Tạo thư mục: `backend/public/packages`
- [ ] Backend đang chạy (check port 5000)
- [ ] Token/Authorization hợp lệ
- [ ] ZIP file không bị hỏng
- [ ] ZIP file chứa `index.html`

## 🐛 Debug - Xem logs

### Check console backend
Khi upload, xem output trong terminal chạy backend:
```
Extracting package to: /path/to/backend/public/packages/lesson-xxxxx
Extract result: { success: true, indexPath: ... }
```

### Check browser console
Nhấn F12 → Console tab → Xem lỗi chi tiết

### Check file được upload
```bash
ls -la backend/public/packages/
# Nên thấy folder lesson-xxxxx với index.html bên trong
```

## 🆘 Nếu vẫn lỗi

### Bước 1: Kiểm tra backend connect
```bash
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Test
curl http://localhost:5000/health
```

### Bước 2: Kiểm tra file upload
```bash
# Gửi file bình thường (không ZIP)
curl -X POST http://localhost:5000/api/lessons \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "course_id=1" \
  -F "chapter_id=1" \
  -F "title=Test Document" \
  -F "file=@document.pdf"
```

### Bước 3: Kiểm tra ZIP
```bash
# Đảm bảo ZIP hợp lệ
unzip -t test.zip
# Nên thấy: testing test.zip OK
```

## 📝 Full Setup Guide

```bash
# 1. Cài dependencies
cd backend
npm install
npm install extract-zip

# 2. Tạo folders
node init-folders.js

# 3. Tạo .env file
cat > .env << EOF
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=lms_db
JWT_SECRET=your-secret-key-min-32-chars
NODE_ENV=development
PORT=5000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
EOF

# 4. Khởi tạo database
npm run init-db

# 5. Chạy backend
npm run dev
```

## 📚 Tài liệu liên quan

- [ZIP_PACKAGE_SYSTEM.md](ZIP_PACKAGE_SYSTEM.md) - Chi tiết hệ thống
- [backend/ZIP_PACKAGE_HANDLER.md](backend/ZIP_PACKAGE_HANDLER.md) - Backend docs
- [PACKAGE_VIEWER_INTEGRATION.md](PACKAGE_VIEWER_INTEGRATION.md) - Frontend docs

## 🎯 Verify Upload hoạt động

1. Thêm bài học mới → Chọn file ZIP
2. Nhấn "Tạo bài học"
3. Kiểm tra console backend → xem logs
4. Nếu thành công, file sẽ ở: `backend/public/packages/lesson-xxxxx/index.html`
5. Xem bài học → Package hiển thị trong iframe

## 💡 Troubleshooting Commands

```bash
# List packages
ls -la backend/public/packages/

# Check folder permissions
stat backend/public/packages/

# Test extract-zip
node -e "require('extract-zip')" 

# Check server logs
pm2 logs lms-backend (if using PM2)
```

---

Nếu vẫn gặp vấn đề, hãy kiểm tra:
1. ✓ npm dependencies cài đặt
2. ✓ Folders được tạo
3. ✓ Backend chạy
4. ✓ Authorization token hợp lệ
