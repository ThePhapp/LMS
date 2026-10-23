# LMS — Lớp Học Đổi Mới

LMS gồm một API Express/PostgreSQL ở `backend/` và React/Vite app ở `frontend/`.

## Yêu cầu

- Node.js 20+ (CI/local hiện đã kiểm tra trên Node 22)
- npm 10+
- PostgreSQL có SSL/TLS khi chạy ngoài local
- Cloudflare R2 cho file storage production
- Gemini API key server-side nếu bật AI chat

## Chạy local

Không commit file `.env`. Tạo biến môi trường trong `backend/.env` theo danh sách dưới đây.

```powershell
cd backend
npm install
npm run db:migrate:dry
npm start
```

Terminal thứ hai:

```powershell
cd frontend
npm install
npm run dev
```

Frontend mặc định gọi `http://localhost:5000/api`. Đổi endpoint bằng `VITE_API_URL`.

## Biến môi trường

Backend production yêu cầu: `DATABASE_URL`, `JWT_SECRET` (tối thiểu 32 ký tự), `ALLOWED_ORIGINS`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PRIVATE_BUCKET_NAME`, `R2_PUBLIC_URL`.

Các biến tùy chỉnh khác: `PORT`, `NODE_ENV`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ACCESS_TTL`, `FILE_TICKET_TTL`, `FILE_COOKIE_SAME_SITE`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_TIMEOUT_MS`, `JSON_BODY_LIMIT`, `REQUEST_TIMEOUT_MS`, `API_RATE_LIMIT_WINDOW_MS`, `API_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX`, `FILE_RATE_LIMIT_WINDOW_MS`, `FILE_RATE_LIMIT_MAX`.

Frontend chỉ dùng `VITE_API_URL`; không đưa Gemini key vào frontend.

## Migration và seed

```powershell
cd backend
npm run db:migrate:dry     # chỉ xem kế hoạch
npm run db:migrate         # additive/idempotent migration
npm run db:status
npm run db:check
npm run db:seed            # chỉ khi ALLOW_DEMO_SEED=true và không phải production
```

Không reset database production và không chạy seed production.

## API chính

| Prefix | Chức năng |
| --- | --- |
| `/health`, `/ping` | health check |
| `/api/auth` | register/login/me |
| `/api/courses`, `/api/chapters`, `/api/lessons` | catalog và authoring |
| `/api/enrollments` | enrollment và progress |
| `/api/assignments` | assignment, quiz, attempt, grading |
| `/api/interactions` | notes, comments, forum interactions |
| `/api/events` | timetable/events |
| `/api/admin` | admin dashboard/course management |
| `/api/files` | authorized file/package access |
| `/api/ai` | authenticated server-side Gemini proxy |

Public registration luôn tạo `student`; role `lecturer`/`admin` do workflow quản trị cấp. Backend là nguồn quyết định authorization cuối cùng.

## File và AI security

- File lesson/submission private không được serve bằng static `/uploads`.
- Access dùng authorization + ticket ngắn hạn; package path traversal/symlink/zip bomb bị kiểm tra trước extraction.
- File upload kiểm tra extension/magic bytes/size và cleanup failure path.
- Gemini key chỉ ở backend; request có auth, bounded history/prompt, timeout và rate limit.

## Kiểm tra trước merge

```powershell
cd backend
npm run check
npm audit --omit=dev

cd ../frontend
npm run check
npm audit --omit=dev
```

GitHub Actions chạy cùng quality gate này trên mọi push và pull request.

UI smoke dùng Playwright với fixture mock cho các flow không cần database fixture: landing/auth, dashboard, admin, learning, editor và assignment ở desktop/375px. Live DB integration/E2E cần PostgreSQL tenant DNS/credentials hợp lệ; không tự sửa credential hoặc chạy migration destructive.

## Tài liệu

- [Audit report](docs/AUDIT_REPORT.md)
- [Task plan và commit ledger](docs/TASK_PLAN.md)
- [Final report](docs/FINAL_REPORT.md)
- [ZIP package notes](ZIP_PACKAGE_SYSTEM.md)
- [Package viewer integration](PACKAGE_VIEWER_INTEGRATION.md)
