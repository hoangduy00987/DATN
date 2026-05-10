# Next.js Chat Frontend

Frontend chat sử dụng Next.js để gọi API FastAPI RAG chatbot.

## 1) Cấu hình env

```bash
cp .env.example .env.local
```

Mặc định API backend:

```env
BACKEND_CHAT_URL=http://localhost:8000/api/v1/chat/chat
```

## 2) Cài dependencies

```bash
npm install
```

## 3) Chạy dev

```bash
npm run dev
```

Mở: `http://localhost:3000`

## Ghi chú

- Frontend gọi route nội bộ `/api/chat` (server-side proxy), sau đó route này gọi sang FastAPI.
- Payload gửi đi chỉ gồm:

```json
{ "query": "..." }
```
