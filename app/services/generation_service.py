from fastapi import HTTPException
import requests
import time
from app.core.config import settings

GEN_URLS = [
    settings.GEN_URL,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
]
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
MAX_RETRIES = 3

def generate_answer(query: str, context: str):
    prompt = f"""
Bạn là chatbot tư vấn bệnh phổi.

QUY TẮC:
- Chỉ trả lời dựa vào CONTEXT
- Không được bịa
- Nếu không có thông tin → nói không biết
- Nếu câu hỏi ngoài bệnh phổi/hô hấp → trả lời đúng 1 câu: "Hệ thống hiện chỉ hỏi đáp về các bệnh thường gặp ở phổi."
- Nếu có bệnh phổi như là covid-19 hay khí phế thũng vẫn trả về kết quả bình thường dựa trên CONTEXT vì đó là bệnh phổi mặc dù k có câu nào hỏi đến phổi
- trả lời chi tiết nhất có thể
- và k được nói những từ như dựa trên Context hay thông tin đã cho, mà phải trả lời tự nhiên như một chuyên gia tư vấn bệnh phổi thực thụ, không được nhắc đến việc có CONTEXT hay thông tin đã cho ở đâu cả, chỉ trả lời câu trả lời thôi, không được nói thêm gì khác
CONTEXT:
{context}

QUESTION:
{query}

Trả lời ngắn gọn, rõ ràng.
"""

    try:
        last_response = None
        for gen_url in GEN_URLS:
            for attempt in range(1, MAX_RETRIES + 1):
                res = requests.post(
                    gen_url,
                    headers={"Content-Type": "application/json"},
                    params={"key": settings.GEMINI_API_KEY},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.2}
                    },
                    timeout=30,
                )
                last_response = res

                if res.status_code == 200:
                    data = res.json()
                    try:
                        return data["candidates"][0]["content"]["parts"][0]["text"]
                    except (KeyError, IndexError, TypeError):
                        raise HTTPException(status_code=502, detail="Generate error: invalid model response format")

                if res.status_code in RETRYABLE_STATUS_CODES and attempt < MAX_RETRIES:
                    time.sleep(attempt)
                    continue

                if res.status_code not in RETRYABLE_STATUS_CODES:
                    raise HTTPException(status_code=res.status_code, detail="Generate error: " + res.text)

            time.sleep(1)

        if last_response is not None and last_response.status_code == 503:
            raise HTTPException(status_code=503, detail="Model đang quá tải tạm thời, vui lòng thử lại sau vài giây.")

        raise HTTPException(status_code=503, detail="Không thể tạo câu trả lời lúc này, vui lòng thử lại sau.")
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Generate request failed: {e}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))