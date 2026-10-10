# Kế hoạch task và commit

Quy trình: `AUDIT → PLAN → IMPLEMENT → TEST → REVIEW → COMMIT → NEXT`.

Trạng thái hợp lệ: `TODO`, `IN PROGRESS`, `BLOCKED`, `DONE`. Mỗi task chỉ chuyển `DONE` sau khi test/verification tương ứng chạy xong. Không stage `backend/.env` hoặc artifact người dùng.

## Task board

| ID | Priority | Scope | Agent | Dependencies | Files affected | Acceptance criteria | Test command | Status | Commit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-001 | P0 | Baseline, source/doc drift, audit report, task board | Lead + A/B/E/F | — | `docs/AUDIT_REPORT.md`, `docs/TASK_PLAN.md` | Baseline có PASS/FAIL/BLOCKED; P0-P3 có evidence; không đọc/stage `.env` | `npm run lint`; `npm run build`; backend `node --check`; `/ping`; DB `SELECT 1`; `npm audit --omit=dev` | DONE | `42dc5bd` |
| SEC-001 | P0 | Chặn role escalation; validation auth cơ bản; JWT hardening tối thiểu | Backend | AUD-001 | auth controller/middleware/routes, tests | Public register không thể tạo admin/lecturer; privileged role lấy từ DB; input lỗi trả 4xx; regression tests PASS | `npm test -- auth` | TODO | pending |
| SEC-002 | P0 | Fail-closed ZIP; chống symlink/bomb/path traversal; cleanup | AI & Files + Security | AUD-001 | lesson routes/controller, zip handler, storage, tests | ZIP nguy hiểm bị reject trước upload; budget rõ; temp/R2 rollback; không còn dependency vulnerable trong path | `npm test -- zip` + adversarial fixture tests | TODO | pending |
| REPO-001 | P0 | Secret/artifact hygiene | Lead | AUD-001 | `.gitignore`, Git index | `.env`, `node_modules`, upload tmp không còn track; lockfiles được giữ; local `.env` còn nguyên nhưng ignored | `git ls-files` assertions; secret scan redacted | DONE | `e39fd0d` |
| AUTHZ-001 | P1 | Course/enrollment/assignment/submission ownership matrix | Backend + LMS | SEC-001 | assignment/course/enrollment/lesson/interaction policies, tests | Cross-course lecturer/student access trả 403/404; owner/admin/enrolled paths đúng; quiz answer không leak | `npm test -- authorization` | TODO | pending |
| LMS-001A | P0 | Chặn data-loss khi sửa assignment | Frontend | AUD-001 | `CourseEditor.jsx` | Edit dùng PUT, không xóa assignment cũ; creation vẫn dùng POST; build PASS | focused `rg`; `npm run build` | DONE | self; exact hash backfilled in next docs update |
| LMS-001 | P1 | Assignment lifecycle, attempts, grading, gradebook | LMS | AUTHZ-001 | assignment controller, DB constraints/tests | Bulk save transaction; attempt atomic; grade range; progress đúng | `npm test -- assignments`; focused frontend build/lint | TODO | pending |
| FILE-001 | P1 | Private upload/download, MIME verification, R2 deletion | AI & Files | SEC-002, AUTHZ-001 | upload routes, storage service, viewer/API | Submission/lesson file không public trực tiếp; magic-byte/type policy; signed/auth access; delete/replace cleanup | `npm test -- files` + direct URL unauthorized test | TODO | pending |
| AI-001 | P1 | Backend Gemini proxy, auth/rate/token/history/privacy | AI & Files | SEC-001, API-001 | backend AI route/service, two frontend chat components, docs/tests | Không còn `VITE_GEMINI_API_KEY`; bounded prompt/history/timeout; auth/rate limit; clear errors | frontend build grep key/Google URL; backend AI tests | TODO | pending |
| API-001 | P1 | Express app factory, config validation, errors, headers, rate limits | Backend | SEC-001 | `server.js`, config, middleware, package files, tests | Central error shape; security headers; body/time/rate limits; testable app; `/health` hoặc docs thống nhất | `npm test`; startup smoke; header assertions | TODO | pending |
| DB-001 | P1 | PostgreSQL canonical migrations/constraints/indexes/transactions | Database | AUTHZ-001, LMS-001 | db config, migrations, init/seed scripts, package scripts | Không MySQL drift; migration idempotent/non-destructive; FK/index/unique đúng; TLS config rõ | migration dry run trên DB test; schema assertions | TODO | pending |
| FE-001 | P1 | AuthContext/API client/role guards/lint/runtime bugs/lazy routes | Frontend | SEC-001, API-001 | App, contexts, services, affected pages/components | 0 lint error; stale state/promise cleanup; instructor/admin guards; 401 handling; bundle split | `npm run lint`; `npm run build` | TODO | pending |
| UI-001 | P2 | Design system + app shell + auth/dashboard/course/learning/admin/viewer screens | Frontend UI | FE-001, FILE-001, AI-001 | CSS, shared UI components, pages | Brand indigo giữ nguyên; component/state nhất quán; desktop/tablet/375px không overflow; keyboard labels; loading/error/empty | UI probe sweep 375/768/1280/1440/1920 + screenshots | TODO | pending |
| QA-001 | P1 | Backend/frontend/integration/E2E/CI | QA & Security | SEC-*, AUTHZ-001, LMS-001, FE-001 | tests, fixtures, CI workflow | Route matrix + critical flows chạy; PASS/FAIL/SKIPPED trung thực; audit gate trong CI | backend tests; frontend tests; Playwright CLI critical flows; audits | TODO | pending |
| DOC-001 | P2 | README/setup/API/auth/storage/AI/deploy/troubleshooting/final report | Lead | All completed tasks | README, docs, `docs/FINAL_REPORT.md` | Tài liệu khớp source/version/script; task→commit map; limitation và blocked evidence | Link/script verification; final regression | TODO | pending |

## Thứ tự triển khai

1. `AUD-001`
2. `SEC-001`, `SEC-002`, `REPO-001`
3. `AUTHZ-001`, `API-001`
4. `LMS-001`, `FILE-001`, `AI-001`, `DB-001`
5. `FE-001`, `UI-001`
6. `QA-001`, `DOC-001`

Task độc lập chỉ chạy song song khi write-set không giao nhau. Mọi migration phải additive/idempotent; không reset hoặc xóa dữ liệu production.

## Baseline test ledger

| Test | Result | Note |
| --- | --- | --- |
| Frontend lint | FAIL | 44 errors, 15 warnings |
| Frontend build | PASS/WARN | Main JS 715.55 kB |
| Backend startup | PASS | Port 5000 |
| `GET /ping` | PASS | Health response hợp lệ |
| Backend syntax | PASS | All JS |
| Database `SELECT 1` | BLOCKED/FAIL | DNS/tenant `ENOTFOUND` |
| Backend tests | SKIPPED | Không tồn tại |
| Frontend tests | SKIPPED | Không tồn tại |
| E2E | BLOCKED | DB chưa kết nối, chưa có fixture |
| Frontend production audit | FAIL | 5 vulnerabilities |
| Backend production audit | FAIL | 9 vulnerabilities |

