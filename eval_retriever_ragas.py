import os
import sys
import io

# Fix Windows console encoding issues for Vietnamese print statements
if sys.platform.startswith("win"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import json
import time
import pandas as pd
from dotenv import load_dotenv
from datasets import Dataset

# Import settings and retrieval services from project
from app.core.config import settings
from app.services.retrieval_service import retrieve_documents

# Import Ragas and Langchain Google wrapper
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from ragas import evaluate
from ragas.metrics import context_recall, context_precision

# Paths
DATASET_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", "evaluation_dataset.json"))
OUTPUT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", "retriever_ragas_results.json"))

def main():
    load_dotenv()
    
    # 1. Check if dataset exists
    if not os.path.exists(DATASET_PATH):
        print(f"Lỗi: Không tìm thấy file câu hỏi test tại {DATASET_PATH}")
        print("Vui lòng chạy file generate_eval_dataset.py trước.")
        return
        
    print(f"Đọc dữ liệu câu hỏi từ {DATASET_PATH}...")
    with open(DATASET_PATH, mode="r", encoding="utf-8") as f:
        test_cases = json.load(f)
        
    total_cases = len(test_cases)
    print(f"Chuẩn bị chạy Retriever cho {total_cases} câu hỏi...")
    
    # We will build dataset for Ragas evaluation
    # To support both old and new versions of Ragas, we populate both sets of keys:
    # Old keys: question, contexts, ground_truth
    # New keys (Ragas >= 0.2.0): user_input, retrieved_contexts, reference
    eval_data = {
        "question": [],
        "contexts": [],
        "ground_truth": [],
        
        "user_input": [],
        "retrieved_contexts": [],
        "reference": []
    }
    
    TOP_K = 3
    
    # 2. Query the retriever for each test case
    for i, case in enumerate(test_cases):
        q = case["question"]
        gt = case["ground_truth"]
        
        print(f"[{i+1}/{total_cases}] Đang truy xuất thông tin cho câu hỏi: '{q[:40]}...'")
        
        try:
            # Query ChromaDB using the project's retriever
            docs = retrieve_documents(q, top_k=TOP_K)
            
            # Extract content from doc metadata
            # In your database structure, documents are dictionaries
            contexts_list = []
            for doc in docs:
                content = doc.get("content") or doc.get("answer") or doc.get("question") or ""
                if content.strip():
                    contexts_list.append(content.strip())
                    
            if not contexts_list:
                contexts_list = ["Không tìm thấy tài liệu phù hợp trong cơ sở dữ liệu."]
                
        except Exception as e:
            print(f"   -> Lỗi truy xuất: {e}")
            contexts_list = ["Lỗi truy xuất tài liệu."]
            
        # Add to evaluation dataset
        eval_data["question"].append(q)
        eval_data["contexts"].append(contexts_list)
        eval_data["ground_truth"].append(gt)
        
        eval_data["user_input"].append(q)
        eval_data["retrieved_contexts"].append(contexts_list)
        eval_data["reference"].append(gt)
        
        # Short delay to prevent hitting Cohere trial rate limits (10 RPM)
        time.sleep(6)
        
    # Convert to Hugging Face Dataset
    dataset = Dataset.from_dict(eval_data)
    
    # 3. Setup Gemini API models for evaluation judge
    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Lỗi: GEMINI_API_KEY không có trong biến môi trường hoặc file .env")
        return
        
    print("\nKhởi tạo mô hình đánh giá Gemini cho Ragas...")
    evaluator_llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key, temperature=0)
    evaluator_embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004", google_api_key=api_key)
    
    # 4. Evaluate using Ragas
    print("Đang chạy Ragas để chấm điểm Retriever (Context Recall & Context Precision)...")
    try:
        result = evaluate(
            dataset=dataset,
            metrics=[context_recall, context_precision],
            llm=evaluator_llm,
            embeddings=evaluator_embeddings
        )
        
        # Convert results to DataFrame
        df = result.to_pandas()
        
        # Save results to JSON
        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        df.to_json(OUTPUT_PATH, orient="records", force_ascii=False, indent=2)
        
        print("\n" + "="*50)
        print("HOÀN THÀNH ĐÁNH GIÁ RETRIEVER VỚI RAGAS!")
        print(f"Điểm số trung bình:")
        print(f" - Context Recall (Độ bao phủ): {df['context_recall'].mean():.4f}")
        print(f" - Context Precision (Độ chính xác ngữ cảnh): {df['context_precision'].mean():.4f}")
        print(f"Chi tiết kết quả được lưu tại: {OUTPUT_PATH}")
        print("="*50)
        
    except Exception as e:
        print(f"\nLỗi khi chạy đánh giá Ragas: {e}")
        print("Mẹo: Đảm bảo bạn đã cài đặt các thư viện bằng lệnh: pip install ragas langchain-google-genai pandas")

if __name__ == "__main__":
    main()
