# Báo cáo audit hệ thống LMS

Ngày audit: 2026-10-10  
Nhánh triển khai: `codex/lms-hardening-20261010`  
Phạm vi: frontend, backend, PostgreSQL, upload/R2, ZIP package, Gemini, tài liệu, dependency và baseline vận hành.

## 1. Kết luận điều hành

Hệ thống build được và Express khởi động được, nhưng **chưa an toàn để public**. Hai lỗi P0 có thể ghép thành chuỗi tấn công nghiêm trọng:

1. API đăng ký công khai chấp nhận vai trò `admin` từ client và phát JWT admin 30 ngày.
2. Tài khoản lecturer/admin có thể upload ZIP; thư viện giải nén hiện tại giữ symlink, rồi bộ upload R2 có thể follow symlink và công khai tệp cục bộ của server.

Ngoài ra, các API assignment/gradebook thiếu kiểm tra ownership, nội dung khóa học và package thiếu enrollment gate, file submission được public trực tiếp, Gemini key nằm trong bundle frontend, và codebase chưa có test/CI.

## 2. Baseline đã chạy

| Hạng mục | Kết quả | Bằng chứng |
| --- | --- | --- |
| Runtime | PASS | Node `v22.15.0`, npm `11.6.2` |
| Frontend lint | FAIL | 44 lỗi, 15 cảnh báo |
| Frontend production build | PASS có cảnh báo | Bundle JS chính 715.55 kB, gzip 199.77 kB; chưa code-split |
| Backend syntax | PASS | Toàn bộ `.js` qua `node --check` |
| Backend startup | PASS | `npm start`, port 5000 |
| API health | PASS | `GET /ping` trả `{ status: "ok" }` |
| Database connectivity | FAIL/BLOCKED | Truy vấn vô hại `SELECT 1` lỗi DNS/tenant `ENOTFOUND`; không chạy script in PII |
| Existing tests | MISSING | Không có test script hoặc test suite first-party |
| Frontend dependency audit | FAIL | 5 production vulnerabilities: 4 high, 1 moderate |
| Backend dependency audit | FAIL | 9 production vulnerabilities: 1 critical, 4 high, 3 moderate, 1 low |

Không có dữ liệu production nào bị thay đổi. `backend/.env` không được đọc và là thay đổi có sẵn của người dùng trước audit.

## 3. Source thực tế so với tài liệu

| Chủ đề | Tài liệu | Source thực tế |
| --- | --- | --- |
| React | React 18 | React 19.2.4 |
| Vite | Không khóa rõ | Vite 8.0.7; yêu cầu Node mới hơn Node 16 trong tài liệu |
| Express | Không khóa rõ | Express 5.2.1 |
| Database | MySQL/PostgreSQL, biến `DB_HOST/...` | `pg` + `DATABASE_URL`; `migrate.js` vẫn là MySQL và không chạy được |
| Supabase | Được mô tả như DB/storage | Có dependency Supabase nhưng runtime DB dùng `pg`; storage file dùng Cloudflare R2 |
| Package storage | Local `public/packages` | Giải nén local tạm rồi upload public lên R2 |
| JWT | Access + refresh | Một JWT 30 ngày; không có refresh/logout API |
| Health | `/health`, `/api/health` | Chỉ có `/ping` |
| Gemini | `VITE_GEMINI_API_KEY` | Gọi trực tiếp từ browser, key public trong bundle |
| Backend scripts | `init-db`, `migrate`, `seed`, `check-db` | `package.json` chỉ có `start`, `dev` |
| ZIP tests | Tài liệu nói có test handler | Không có test ZIP thực thi; chỉ có fixture HTML tĩnh |

## 4. Phát hiện theo mức ưu tiên

### P0 — Critical

#### P0-01: Public registration tự cấp quyền admin

- `backend/controllers/authController.js:11-35` nhận `role`, cho phép `admin`/`lecturer`, lưu DB và ký JWT.
- `backend/routes/auth.js:10` mở route đăng ký không cần xác thực.
- Tác động: người chưa đăng nhập có thể tự tạo admin, đọc user, xóa course và mở toàn bộ surface đặc quyền.
- Hướng sửa: public registration luôn là `student`; lecturer/admin phải qua admin workflow; privileged authorization phải kiểm tra role hiện tại từ DB.

#### P0-02: ZIP symlink có thể làm lộ file/secret server

- `backend/utils/zipHandler.js:63-95` giải nén trước khi kiểm tra và không chặn symlink/hardlink.
- `extract-zip@2.0.1` có advisory symlink traversal/arbitrary write, không có bản vá trực tiếp.
- `backend/config/storage.js:102-129` duyệt cây và `createReadStream` theo path, có thể follow symlink rồi upload public lên R2.
- Tác động: trên Linux, lecturer không tin cậy có thể làm lộ `/proc/self/environ`, JWT/DB/R2 credential hoặc file server đọc được.
- Hướng sửa tức thời: disable ZIP upload fail-closed cho tới khi có extractor/quarantine an toàn; sau đó preflight archive, budget, `lstat`/`realpath`, sandbox và storage private.

#### P0-03: Sửa assignment bằng delete + recreate làm mất dữ liệu

`frontend/src/pages/CourseEditor.jsx:318-323` xóa assignment cũ rồi tạo lại dù backend đã có PUT. Foreign key cascade xóa questions, submissions, attempts và grades; nếu POST kế tiếp lỗi thì assignment biến mất hoàn toàn. Bulk replace questions cũng delete trước insert và không có transaction.

### P1 — High

#### P1-01: Assignment/gradebook BOLA giữa các lecturer

Các thao tác create/update/delete assignment, bulk question, submissions, stats, grade và gradebook chỉ check role, không check `courses.lecturer_id`. Lecturer A có thể sửa/chấm/xem dữ liệu khóa học của lecturer B.

#### P1-02: Draft assignment, submission và đáp án quiz bị truy cập sai quyền

- Bất kỳ user có JWT có thể GET/POST assignment theo ID mà không cần enrollment hoặc `status='published'`.
- Sau một lần submit, GET trả `correct_option`/`correct_answer` dù còn lượt làm.
- Response submit quiz cũng trả đáp án đúng ngay.
- `time_limit` chỉ chạy ở frontend nên có thể bypass.

#### P1-03: Course/lesson/package thiếu enrollment/paywall gate

`GET /api/courses/:id` trả toàn bộ lesson/content/file URL cho mọi user có JWT. `package-info`, progress, notes/comments cũng thiếu access policy tập trung. R2 URL là public và dài hạn.

#### P1-04: File submission private bị public

Essay upload ghi dưới `backend/uploads`, trong khi `server.js` public toàn bộ `/uploads`. Không có authorization, signed URL, MIME verification hoặc cleanup đầy đủ.

#### P1-05: ZIP bomb và request reset

Input ZIP cho phép tới 500 MB nhưng không giới hạn expanded bytes, số entry, compression ratio, độ sâu, thời gian hoặc disk quota. Đây là nguyên nhân hợp lý nhất cho `net::ERR_CONNECTION_RESET`; proxy timeout/body limit và thời gian upload R2 là hai nguyên nhân kế tiếp.

#### P1-06: Gemini API key nằm trong frontend

`AiChat.jsx` và `LessonAiChat.jsx` dùng `VITE_GEMINI_API_KEY` và gọi Google trực tiếp. Key, quota, history và lesson content không có auth/rate limit/cost control phía server.

#### P1-07: JWT đặc quyền sống 30 ngày và không revocation

Middleware tin role trong token. Đổi mật khẩu vẫn giữ token cũ; không có issuer/audience/algorithm pin, refresh rotation hoặc token version.

### P2 — Medium

- Không có rate limit cho auth/forum/upload/AI.
- CORS allowlist là điểm tốt, nhưng `credentials: true` không cần với bearer token.
- DB TLS đặt `rejectUnauthorized: false` cho mọi remote host.
- Error message DB/internal được trả trực tiếp; comment error log cả nội dung người dùng.
- Multer chỉ kiểm tra extension ở lesson, không verify magic bytes; avatar/thumbnail không có type filter; assignment upload không có filter.
- Iframe package cấp scripts + same-origin + popups + forms + modals và hàng loạt device permissions; link mở tab mới chạy không sandbox.
- R2 object cũ không được xóa khi replace/delete lesson; temp cleanup chưa bao phủ mọi failure path.
- `COUNT(*)` PostgreSQL là string, nên `attemptCount + 1` có thể thành `"01"`, `"11"`.
- Attempt limit có race condition do count-check-insert không transaction/lock.
- Gradebook đếm cả progress row `completed=false`.
- Admin event filter nối `AND` sau query không có `WHERE`, gây 500.
- Schema cho phép lesson/assignment trỏ chapter thuộc course khác.
- Query assignment/student có N+1; dashboard thiếu pagination ở dữ liệu lớn.
- Frontend không có role guard cho instructor routes; backend vẫn phải là nguồn phân quyền chính.
- Nút “Xuất bản khóa học” chỉ hiện toast thành công, không gọi API hoặc lưu trạng thái.
- Hai CTA “Tạo khóa học” của lecturer dẫn nhầm về catalogue `/courses`.
- Admin sidebar biến mất dưới 1024 px nhưng nút mở luôn `display:none`; `/admin/users` và `/admin/settings` dẫn về dashboard giả.
- Route lạ ngoài admin cho màn trống; wildcard admin giả làm Dashboard thay vì 404.
- Dashboard có số liệu hardcode/fabricated và một số lỗi API bị nuốt thành empty state hợp lệ.
- Timetable luôn giữ 8 cột trong khi body ẩn overflow ngang, làm mobile bị bóp/cắt.
- AuthContext parse localStorage không bắt JSON hỏng, không có response interceptor/refresh, và lưu bearer token trong localStorage.
- 44 lint errors gồm stale effects, hàm dùng trước khai báo, silent catches, random trong render và state sync trong effect.
- Bundle chưa lazy-load routes.

### P3 — Low / Hygiene

- `backend/.env` đang được track dù `.gitignore` có rule; nội dung working tree không được đọc.
- `backend/node_modules` có 1.272 path được track.
- Hai ZIP tạm giống nhau, mỗi file khoảng 79,7 MB, đang được track trong `backend/uploads/tmp`.
- Lockfile đang track nhưng `.gitignore` lại ignore lockfile, gây quy ước mâu thuẫn.
- Frontend README vẫn là template Vite.
- Tài liệu khẳng định nhiều chức năng bằng dấu ✅ nhưng không có test chứng minh.

## 5. UI/UX audit và brief triển khai

Audit stack UI: React 19 + Vite 8 + CSS thuần; không Tailwind/shadcn; token tập trung ở `frontend/src/index.css`; có Navbar, AdminLayout, AI chat, assignment viewer và package viewer. Copy song ngữ nằm ở `LangContext`, nhưng nhiều màn vẫn hardcode tiếng Việt. Phong cách hiện hữu là indigo brand, gradient ở 18 file và elevation ở 8 file; scrollbar mới chỉ áp riêng cho learning sidebar.

Brief dùng cho nhánh `dựng luôn`:

- Sản phẩm: LMS đa vai trò có khóa học, lesson, assignment, gradebook, lịch, forum, AI và interactive package (đọc code).
- Người dùng: student, lecturer, admin (đọc code và yêu cầu).
- Việc chính: học và theo dõi tiến độ; tạo/chấm nội dung; quản trị và giám sát hệ thống (đọc code).
- Nền tảng: desktop-first cho authoring/grading, responsive 375 px cho learning và tra cứu (suy ra từ nghiệp vụ; cần telemetry để xác nhận).
- Điểm khác biệt: interactive ZIP package và AI theo lesson; phải xuất hiện rõ trong course learning nhưng chỉ sau khi được cách ly an toàn (đọc code).

Hướng UI được chọn nội bộ: giữ indigo brand, gradient có kiểm soát và elevation nhẹ; chuẩn hóa app shell, token, button/form/card/badge/table/modal/toast/loading/empty/error trước, sau đó áp theo nhóm route. Không thêm UI library lớn.

## 6. Điểm tích cực

- Query runtime nhìn chung parameterized; chưa thấy SQL injection trực tiếp.
- Password dùng bcrypt và login trả lỗi credential chung.
- CORS dùng exact-origin allowlist.
- Ownership check đã có ở course/chapter/lesson/event/course-roster và có thể tái dùng thành policy tập trung.
- Build production hiện hoàn thành và backend qua syntax check.

## 7. Giới hạn audit

- Database integration/E2E bị chặn bởi kết nối DB hiện tại; không tự sửa credential hoặc chạy destructive migration.
- Không có credential Gemini/R2 hợp lệ để kiểm thử provider thật.
- Chưa thể coi các flow nghiệp vụ PASS nếu chưa có DB test fixture và browser E2E.
- Credential từng tồn tại trong lịch sử Git cần được rotate và scan/redact; trạng thái rotate chưa xác minh.

