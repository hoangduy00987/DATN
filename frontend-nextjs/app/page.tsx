"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "bot";
  text: string;
  imageUrl?: string | null;
  meta?: {
    detection?: {
      label?: string;
      score?: number | null;
    };
  } | null;
};

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Xin chào, tôi có thể giúp gì cho bạn về các bệnh lý phổi?",
    },
  ]);
  const STORAGE_KEY = "chat_messages_v1";
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => query.trim().length > 0 && !loading, [query, loading]);

  const scrollToBottom = () => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSend && !file) return;
    const userText = query.trim();
    setQuery("");
    setLoading(true);

    if (file) {
      const readFileAsDataURL = (f: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });

      const dataUrl = await readFileAsDataURL(file);
      setMessages((prev) => [...prev, { role: "user", text: userText || "", imageUrl: dataUrl }]);
      removeFile();
      try {
        const form = new FormData();
        form.append("file", file);
        if (userText) form.append("query", userText);

        const res = await fetch("/api/chat/upload", {
          method: "POST",
          body: form,
        });

        const data = await res.json();
        if (!res.ok) {
          const detail = data?.detail || "Không thể xử lý hình ảnh.";
          throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
        }

        const rawAnswer = typeof data?.answer === "string" ? data.answer : typeof data === "string" ? data : JSON.stringify(data);
        const detectRegex = /^\[Phát hiện:\s*([^\]]+)\]\s*([\s\S]*)$/;
        const m = rawAnswer.match(detectRegex);
        let answerText = rawAnswer;
        let meta: ChatMessage["meta"] = null;

        if (m) {
          answerText = m[2] || "";
          const detectContent = m[1] || "";
          const scoreRegex = /(.+)\(score=([0-9.]+)\)/;
          const sm = detectContent.match(scoreRegex);
          if (sm) {
            const label = sm[1].trim();
            const score = parseFloat(sm[2]);
            meta = { detection: { label, score } };
          } else {
            meta = { detection: { label: detectContent.trim(), score: null } };
          }
        }
        setMessages((prev) => [...prev, { role: "bot", text: answerText, meta }]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
        setMessages((prev) => [...prev, { role: "bot", text: `Lỗi: ${errorMessage}` }]);
      } finally {
        setLoading(false);
        removeFile();
        setTimeout(scrollToBottom, 0);
      }
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text: userText }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userText }),
      });

      const data = await res.json();
      if (!res.ok) {
        const detail = data?.detail || "Không thể lấy phản hồi từ hệ thống.";
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }

      const answer = typeof data?.answer === "string" ? data.answer : "Không có phản hồi hợp lệ.";
      setMessages((prev) => [...prev, { role: "bot", text: answer }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
      setMessages((prev) => [...prev, { role: "bot", text: `Lỗi: ${errorMessage}` }]);
    } finally {
      setLoading(false);
      removeFile();
      setTimeout(scrollToBottom, 0);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (f) {
      if (!allowed.includes(f.type)) {
        alert("Chỉ chấp nhận file PNG hoặc JPG/JPEG.");
        e.currentTarget.value = "";
        return;
      }
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const removeFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.length) setMessages(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  return (
    <main className="main">
      <div className="title-container">
        <h1 className="title">Hệ thống AI Bệnh Phổi</h1>
        <p className="subtitle">Tư vấn và chẩn đoán sơ bộ qua hình ảnh X-quang</p>
      </div>

      <div ref={chatRef} className="chat-box">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {message.meta?.detection && (
              <div className="detection-badge">
                <strong>Phát hiện:</strong> {message.meta.detection.label}
                {message.meta.detection.score != null && (
                  <span className="score-text">({(message.meta.detection.score * 100).toFixed(0)}%)</span>
                )}
              </div>
            )}
            {message.imageUrl && (
              <div style={{ marginBottom: 8 }}>
                <img src={message.imageUrl} alt="upload" style={{ width: 224, height: 224, objectFit: "cover", borderRadius: 12 }} />
              </div>
            )}
            <div>{message.text}</div>
          </div>
        ))}
        {loading && <div className="message bot">Đang suy nghĩ...</div>}
      </div>

      <div className="composer-container">
        <form className="composer" onSubmit={onSubmit}>
          <button type="button" className="icon-button" onClick={triggerFileSelect}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>

          {previewUrl && (
            <div className="inline-preview">
              <img src={previewUrl} alt="preview" />
              <button type="button" onClick={removeFile} className="inline-remove">×</button>
            </div>
          )}
          
          <div className="input-wrapper">
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập câu hỏi tại đây..."
            />
          </div>

          <button type="submit" className={`icon-button send ${canSend || file ? 'active' : ''}`} disabled={!canSend && !file}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg"
            onChange={onFileChange}
            style={{ display: "none" }}
          />
        </form>
      </div>
    </main>
  );
}
