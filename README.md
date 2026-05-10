# FastAPI RAG Chatbot

This project is a FastAPI-based chatbot that utilizes a Retrieval-Augmented Generation (RAG) approach to provide responses based on user queries. The chatbot leverages embeddings and document retrieval to generate contextually relevant answers.

## Project Structure

```
fastapi-rag-chatbot
├── app
│   ├── __init__.py
│   ├── main.py
│   ├── api
│   │   ├── __init__.py
│   │   └── v1
│   │       ├── __init__.py
│   │       └── chat.py
│   ├── core
│   │   ├── __init__.py
│   │   └── config.py
│   ├── db
│   │   ├── __init__.py
│   │   └── chroma_client.py
│   ├── models
│   │   ├── __init__.py
│   │   ├── chat_request.py
│   │   └── chat_response.py
│   ├── services
│   │   ├── __init__.py
│   │   ├── ingest_service.py
│   │   ├── embedding_service.py
│   │   ├── retrieval_service.py
│   │   └── generation_service.py
│   └── utils
│       ├── __init__.py
│       └── metadata.py
├── data
│   ├── chroma_db
│   └── processed
│       └── output_rag_ready.jsonl
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd fastapi-rag-chatbot
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Copy the `.env.example` file to `.env` and fill in the required values.

5. **Run the application:**
   ```bash
   uvicorn app.main:app --reload
   ```

## Run with Docker

1. **Prepare environment variables:**
   ```bash
   cp .env.example .env
   ```
   On Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```

2. **Build and run container:**
   ```bash
   docker compose up --build
   ```

3. **Run in detached mode (optional):**
   ```bash
   docker compose up -d --build
   ```

4. **Stop containers:**
   ```bash
   docker compose down
   ```

The API will be available at `http://localhost:8000` and chat endpoint at `http://localhost:8000/api/v1/chat`.

## Usage

Once the application is running, you can access the chatbot API at `http://localhost:8000/api/v1/chat`. You can send chat requests to this endpoint to receive responses based on the ingested data.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.