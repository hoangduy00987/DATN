# Kế Hoạch Chi Tiết — Pipeline Phát Hiện (Detection) cho Chatbot

Mục tiêu: Thêm chức năng cho phép người dùng upload ảnh từ frontend, gửi ảnh lên API detection, nhận nhãn (label) từ model detection, sau đó ghép nhãn này vào prompt mặc định để gọi API chatbot (RAG) nhằm đưa ra hướng điều trị phù hợp.

---

## 1. Tổng quan luồng
- FE (ảnh) -> POST `/api/v1/detect` -> Server detection trả về `{label, score}` -> Server ghép `label` vào default query/prompt -> Gọi API chatbot hiện có để tiến hành retrieval + generation -> Trả kết quả về FE.

## 2. Yêu cầu và giả định
- Yêu cầu:
  - API nhận ảnh (multipart/form-data hoặc base64) và trả về nhãn cùng confidence.
  - Model detection được load từ đường dẫn cấu hình; phần `architect` để trống (user sẽ cung cấp đường dẫn sau).
  - Không thay đổi luồng chatbot chính; detection chỉ cung cấp nhãn để ghép vào prompt.
- Giả định:
  - Model detection là một mô hình PyTorch/ONNX/TF có API `predict(image) -> (label, score)` hoặc có thể thay thế bằng stub ban đầu.
  - Ứng dụng đang dùng FastAPI (đã có trong repo).

## 3. Thành phần chính cần triển khai
- `app/services/detection_service.py` — Pipeline load model và inference ảnh. Để đường dẫn model trống trong `app/core/config.py` (hoặc đọc biến môi trường) và chờ user cung cấp.
- `app/api/v1/detect.py` — Router FastAPI với endpoint `POST /api/v1/detect`.
- `app/core/config.py` — thêm cấu hình `DETECTION_MODEL_PATH` (mặc định là empty string).
- Tài liệu/README test: ví dụ curl và mô tả payload.

## 4. Spec API
- Endpoint: `POST /api/v1/detect`
  - Request: multipart/form-data với field `file` (image) hoặc JSON `{ "image_base64": "..." }`.
  - Response (200):
    ```json
    {
      "label": "LABEL_NAME",
      "score": 0.95,
      "metadata": {"model_path": ""}
    }
    ```
  - Response (4xx/5xx): JSON lỗi với `detail`.

## 5. `detection_service` thiết kế
- Interface public:
  - `class DetectionModel:`
    - `def __init__(self, model_path: str = "")`
    - `def load(self) -> None` — nếu `model_path` rỗng thì chỉ log và dùng stub.
    - `def predict(self, image: PIL.Image.Image) -> Tuple[str, float]` — trả `(label, score)`.
- Implementation notes:
  - Nếu `model_path` rỗng: dùng một stub đơn giản (ví dụ always-return `unknown` hoặc run deterministic heuristic).
  - Khi user cung cấp `model_path`, hỗ trợ load model PyTorch/ONNX/TF tùy cấu hình (ghi chú cách mở rộng trong file).

## 6. Xử lý ảnh
- Accept: file upload (multipart) hoặc base64.
- Preprocessing: resize/crop/normalize theo yêu cầu model (cấu hình default trong service).

## 7. Ghép label vào prompt cho chatbot
- Mẫu prompt mặc định (ví dụ):
  - `"Cho tôi hướng điều trị cho trường hợp: {label}. Thêm ngữ cảnh: {user_query}"`
- Tùy chọn: nếu score thấp (< threshold), có thể kèm thêm tag `"(uncertain)"` hoặc hỏi FE xác nhận trước khi gọi chatbot.

## 8. Cấu hình (config)
- `DETECTION_MODEL_PATH` — mặc định `""` (để trống).
- `DETECTION_CONFIDENCE_THRESHOLD` — mặc định `0.5`.

## 9. Bảo mật & Giới hạn
- Giới hạn kích thước file upload (ví dụ 5MB) — trả lỗi nếu vượt.
- Validate loại file (jpeg/png).

## 10. Logging & Error handling
- Log khi model không có đường dẫn hoặc load thất bại.
- Trả lỗi 500 khi inference gặp exception với message có ý nghĩa.

## 11. Test & ví dụ
- Ví dụ curl (multipart):
  ```bash
  curl -X POST "http://localhost:8000/api/v1/detect" -F "file=@/path/to/image.jpg"
  ```

## 12. Lộ trình triển khai (chi tiết các bước code)
1. Thêm key cấu hình `DETECTION_MODEL_PATH` và `DETECTION_CONFIDENCE_THRESHOLD` vào `app/core/config.py`.
2. Tạo `app/services/detection_service.py`:
   - Định nghĩa `DetectionModel` class với behavior stub khi path rỗng.
   - Thêm helper load/preprocess/predict.
3. Tạo router `app/api/v1/detect.py` với endpoint `POST /api/v1/detect`:
   - Nhận file hoặc base64, parse sang PIL.Image, gọi `DetectionModel.predict`.
   - Trả JSON `{label, score}`.

---

## 13. Ghi chú cho phần `architect`
- Đường dẫn model để trống — code phải an toàn nếu `DETECTION_MODEL_PATH` = `""` (sử dụng stub). Khi user upload model, chỉ cần set biến môi trường / config rồi restart service.

## 14. Next step tôi sẽ làm (nếu bạn đồng ý)
- Thực hiện bước 1 và 2: tạo `app/services/detection_service.py` và router `app/api/v1/detect.py` (với stub model) và chạy thử API local.

---

Nếu bạn đồng ý với kế hoạch này, mình sẽ triển khai bước tiếp theo: tạo `detection_service` và endpoint FastAPI (stub), rồi chạy test nhanh.
