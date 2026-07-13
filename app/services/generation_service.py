import httpx
import json
import asyncio
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


def _gen_url_to_stream_url(gen_url: str) -> str:
    """Cùng model với GEN_URL: ...:generateContent -> ...:streamGenerateContent"""
    if ":streamGenerateContent" in gen_url:
        return gen_url
    if ":generateContent" in gen_url:
        return gen_url.replace(":generateContent", ":streamGenerateContent")
    raise ValueError(
        "GEN_URL phải chứa ':generateContent' (ví dụ .../models/gemini-2.5-flash:generateContent)"
    )


def _build_lung_chat_prompt(query: str, context: str) -> str:
    """Prompt dùng chung cho generate (sync) và stream — không sửa đổi logic ngoài khối này."""
    return f"""
Bạn là chatbot tư vấn bệnh phổi.

QUY TẮC:
- Chỉ trả lời dựa vào CONTEXT
- Không được bịa
- Nếu không có thông tin → nói không biết
- Nếu câu hỏi ngoài bệnh phổi/hô hấp (ví dụ: hỏi về lịch sử, địa lý, toán học, các bệnh không liên quan đến phổi như đau đầu, đau dạ dày, đau chân...) → trả lời đúng 1 câu: "Hệ thống hiện chỉ hỏi đáp về các bệnh thường gặp ở phổi."
- Các câu hỏi về ung thư phổi, lao phổi, hen, viêm phổi, copd, covid-19, khí phế thũng... đều thuộc chủ đề bệnh phổi/hô hấp (trong phạm vi hỗ trợ). Nếu câu hỏi về các bệnh này nhưng không có thông tin trong CONTEXT, hãy trả lời là không biết hoặc hiện tại hệ thống chưa có dữ liệu cụ thể (tuyệt đối không được trả lời câu "Hệ thống hiện chỉ hỏi đáp về các bệnh thường gặp ở phổi.").
- trả lời chi tiết nhất có thể
- và k được nói những từ như dựa trên Context hay thông tin đã cho, mà phải trả lời tự nhiên như một chuyên gia tư vấn bệnh phổi thực thụ, không được nhắc đến việc có CONTEXT hay thông tin đã cho ở đâu cả, chỉ trả lời câu trả lời thôi, không được nói thêm gì khác
- Trả lời bằng tiếng Việt đúng chính tả, dấu câu hợp lý; có thể chỉnh cách diễn đạt cho mạch lạc nhưng không được tự ý thêm, bớt hay thay đổi ý nghĩa y học so với CONTEXT (tên bệnh, liều, chỉ định… phải trùng với nội dung CONTEXT nếu có).
CONTEXT:
{context}

QUESTION:
{query}

Trả lời ngắn gọn, rõ ràng.
"""


def generate_answer(query: str, context: str):
    prompt = _build_lung_chat_prompt(query, context)

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


async def stream_generate_answer(query: str, context: str):
    prompt = _build_lung_chat_prompt(query, context)
    # Cùng model với generate_answer / biến môi trường GEN_URL (không hardcode gemini-1.5)
    url = _gen_url_to_stream_url(settings.GEN_URL)

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2}
    }
    
    params = {"key": settings.GEMINI_API_KEY}
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream("POST", url, params=params, json=payload) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    raise HTTPException(status_code=response.status_code, detail=f"Gemini Stream Error: {error_text.decode()}")
                
                buffer = ""
                async for chunk in response.aiter_text():
                    buffer += chunk
                    # Gemini streams a JSON array of objects
                    # [
                    #   { "candidates": [...] },
                    #   { "candidates": [...] }
                    # ]
                    # We need to find valid JSON objects in the buffer
                    while True:
                        buffer = buffer.strip()
                        if not buffer:
                            break
                            
                        # Remove leading [ or ,
                        if buffer.startswith("["):
                            buffer = buffer[1:].strip()
                        if buffer.startswith(","):
                            buffer = buffer[1:].strip()
                        if buffer.startswith("]"):
                            buffer = buffer[1:].strip()
                            break

                        # Try to find a balanced JSON object
                        depth = 0
                        end_pos = -1
                        for i, char in enumerate(buffer):
                            if char == "{":
                                depth += 1
                            elif char == "}":
                                depth -= 1
                                if depth == 0:
                                    end_pos = i + 1
                                    break
                        
                        if end_pos != -1:
                            obj_str = buffer[:end_pos]
                            buffer = buffer[end_pos:].strip()
                            try:
                                obj = json.loads(obj_str)
                                text = obj["candidates"][0]["content"]["parts"][0]["text"]
                                yield text
                            except (KeyError, IndexError, json.JSONDecodeError):
                                continue
                        else:
                            break
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Stream request failed: {e}")
        except Exception as e:
            yield f"Lỗi hệ thống: {str(e)}"