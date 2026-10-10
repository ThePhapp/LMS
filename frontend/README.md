# LMS frontend

React 19 + Vite 8 frontend của LMS.

## Scripts

```powershell
npm install
npm run dev
npm run lint
npm run build
node --test
npm audit --omit=dev
```

Runtime API endpoint lấy từ `VITE_API_URL`; mặc định là `http://localhost:5000/api`. Không đặt secret provider trong biến `VITE_*`.

Xem hướng dẫn setup, API, auth, storage, AI và QA tại [repository README](../README.md).
