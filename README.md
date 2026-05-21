# FastAPI RAG Chatbot (MVC Architecture)

Dự án này là một chatbot dựa trên FastAPI, sử dụng phương pháp Retrieval-Augmented Generation (RAG) và tích hợp các mô hình Machine Learning (nhận diện bệnh qua ảnh X-quang). Backend đã được thiết kế theo chuẩn mô hình **MVC (Model-Controller-Service)**.

## Cấu trúc thư mục (MVC)

```text
app/
├── main.py                          # Entry point (factory + middleware)
├── core/
│   ├── config.py                    # Cấu hình biến môi trường
│   └── security.py                  # JWT / Auth utilities
├── db/
│   ├── models.py                    # Entity Models (SQLAlchemy ORM)
│   ├── session.py                   # Kết nối & session DB
│   └── chroma_client.py             # Client kết nối ChromaDB
│
├── models/
│   ├── schemas/                     # Data Transfer Objects (Pydantic)
│   │   ├── auth.py                  # DTOs cho Authentication
│   │   ├── chat.py                  # DTOs cho Chat/RAG
│   │   ├── appointment.py           # DTOs cho Lịch khám bệnh
│   │   └── ingest.py                # DTOs cho Ingest tài liệu
│
├── repositories/                    # Data Access Layer (CRUD DB)
│   ├── user_repository.py           # Truy vấn bảng users
│   └── appointment_repository.py    # Truy vấn bảng appointments & medical_results
│
├── services/                        # Business Logic Layer
│   ├── auth_service.py              # Logic Đăng ký / Đăng nhập
│   ├── appointment_service.py       # Logic xử lý lịch khám bệnh
│   ├── chat_service.py              # Logic RAG pipeline (chat & image)
│   ├── detect_service.py            # Singleton wrapper cho ML models
│   ├── ingest_task_service.py       # Logic chạy nền ingest dữ liệu
│   ├── detection_service.py         # ML model classes (Keras/TensorFlow)
│   ├── embedding_service.py         # Gọi API tạo embedding (Gemini)
│   ├── generation_service.py        # Gọi API tạo câu trả lời (Gemini)
│   └── retrieval_service.py         # Truy vấn tài liệu từ ChromaDB
│
├── api/v1/                          # Controller Layer (Routers)
│   ├── router.py                    # Gộp tất cả các routers
│   ├── auth.py                      # Route cho Authentication
│   ├── appointments.py              # Route cho Lịch khám
│   ├── chat.py                      # Route cho Chat (Sync/Stream)
│   ├── detect.py                    # Route cho Nhận diện ảnh
│   └── ingest.py                    # Route cho Ingest tài liệu
```

## Hướng dẫn chạy dự án

### 1. Chuẩn bị biến môi trường
Copy file `.env.example` thành `.env` và điền các thông số cần thiết (đặc biệt là API key nếu có).

Trên Windows PowerShell:
```powershell
Copy-Item .env.example .env
```
Trên Linux/Mac:
```bash
cp .env.example .env
```

### 2. Chạy bằng Docker (Khuyên dùng)

Dự án đã được cấu hình sẵn `docker-compose.yml` để chạy trọn gói cả DB và ứng dụng.

**Build và chạy:**
```bash
docker compose up --build
```

**Chạy ngầm (Detached mode):**
```bash
docker compose up -d --build
```

**Dừng container:**
```bash
docker compose down
```

### 3. Chạy Local (Không dùng Docker)

**Tạo môi trường ảo (Virtual Environment):**
```bash
python -m venv venv
# Kích hoạt trên Windows:
venv\Scripts\activate
# Kích hoạt trên Mac/Linux:
source venv/bin/activate
```

**Cài đặt thư viện:**
```bash
pip install -r requirements.txt
```

**Khởi chạy server FastAPI:**
```bash
uvicorn app.main:app --reload
```

Server sẽ chạy tại: `http://localhost:8000`
Tài liệu API (Swagger UI): `http://localhost:8000/docs`