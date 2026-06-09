"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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

function MarkdownText({ text }: { text: string }) {
  // Simple regex-based markdown parser for bold and bullet points
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const parseLine = (line: string, key: string | number) => {
    // Handle bold: **text**
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={key}>
        {parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </span>
    );
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Simple bullet point check: start with * or -
    if (trimmedLine.startsWith("* ") || trimmedLine.startsWith("- ")) {
      listItems.push(<li key={`li-${index}`}>{parseLine(trimmedLine.slice(2), index)}</li>);
    } else {
      // If we were building a list, push it now
      if (listItems.length > 0) {
        elements.push(<ul key={`ul-${index}`}>{listItems}</ul>);
        listItems = [];
      }

      if (trimmedLine) {
        elements.push(<p key={`p-${index}`}>{parseLine(trimmedLine, index)}</p>);
      }
    }
  });

  // Push final list if any
  if (listItems.length > 0) {
    elements.push(<ul key="ul-final">{listItems}</ul>);
  }

  return <div className="markdown-content">{elements}</div>;
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const queryInputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Xin chào, tôi là AI LungCare. Tôi có thể giúp gì cho bạn về các bệnh lý phổi?",
    },
  ]);
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [loadedUserKey, setLoadedUserKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [loadingText, setLoadingText] = useState("Đang suy nghĩ...");
  const chatRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(
    () => query.trim().length > 0 && !loading && !streaming,
    [query, loading, streaming]
  );

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  /** Tách badge [Phát hiện: ...] khỏi nội dung bot (upload ảnh / stream). */
  const applyDetectionMetaToLastMessage = (raw: string) => {
    const detectRegex = /^\[Phát hiện:\s*([^\]]+)\]\s*([\s\S]*)$/;
    const m = raw.match(detectRegex);
    let answerText = raw;
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
    setMessages((prev) => {
      const newMsgs = [...prev];
      const lastIdx = newMsgs.length - 1;
      if (lastIdx < 0 || newMsgs[lastIdx].role !== "bot") return prev;
      newMsgs[lastIdx] = { ...newMsgs[lastIdx], text: answerText, meta };
      return newMsgs;
    });
  };

  const fitQueryTextarea = useCallback(() => {
    const el = queryInputRef.current;
    if (!el || typeof window === "undefined") return;
    el.style.height = "0px";
    const cap = Math.min(window.innerHeight * 0.4, 220);
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), cap)}px`;
  }, []);

  useLayoutEffect(() => {
    fitQueryTextarea();
  }, [query, fitQueryTextarea]);

  useEffect(() => {
    const onResize = () => fitQueryTextarea();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fitQueryTextarea]);

  const handleSendMessage = async (userText: string, fileToSend: File | null) => {
    if (!userText.trim() && !fileToSend) return;
    setQuery("");

    if (fileToSend) {
      const readFileAsDataURL = (f: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });

      const dataUrl = await readFileAsDataURL(fileToSend);
      setStreaming(true);
      setMessages((prev) => [
        ...prev,
        { role: "user", text: userText || "", imageUrl: dataUrl },
        { role: "bot", text: "Đang suy nghĩ..." },
      ]);
      removeFile();
      try {
        const form = new FormData();
        form.append("file", fileToSend);
        if (userText) form.append("query", userText);

        const res = await fetch("/api/chat/upload-stream", {
          method: "POST",
          body: form,
        });

        if (res.status === 401 || res.status === 403) {
          window.location.href = "/login";
          throw new Error("Bạn cần đăng nhập để sử dụng tính năng này.");
        }
        if (!res.ok) {
          let detail = "Không thể xử lý hình ảnh.";
          try {
            const errBody = await res.json();
            detail = typeof errBody?.detail === "string" ? errBody.detail : detail;
          } catch {
            /* ignore */
          }
          throw new Error(detail);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("Không thể khởi tạo bộ đọc stream.");

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              let data: { text?: string; error?: string };
              try {
                data = JSON.parse(line.slice(6)) as { text?: string; error?: string };
              } catch {
                continue;
              }
              if (data.error) throw new Error(data.error);
              if (data.text) {
                fullText += data.text;
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], text: fullText };
                  return newMsgs;
                });
                setTimeout(() => scrollToBottom("auto"), 0);
              }
            }
          }
        }

        applyDetectionMetaToLastMessage(fullText);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
        setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], text: errorMessage };
          return newMsgs;
        });
      } finally {
        setStreaming(false);
        setLoading(false);
        removeFile();
        setTimeout(scrollToBottom, 0);
      }
      return;
    }

    setStreaming(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText },
      { role: "bot", text: "Đang suy nghĩ..." },
    ]);

    try {
      const res = await fetch("/api/chat-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userText }),
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        const detail = data?.detail || "Không thể lấy phản hồi từ hệ thống.";
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Không thể khởi tạo bộ đọc stream.");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // SSE format: data: {"text": "..."}\n\n
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullText += data.text;
                // Update the last message in state
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], text: fullText };
                  return newMsgs;
                });
                // Ensure we scroll to bottom during streaming
                setTimeout(() => scrollToBottom("auto"), 0);
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error("Lỗi parse chunk:", e);
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], text: errorMessage };
        return newMsgs;
      });
    } finally {
      setStreaming(false);
      setLoading(false);
      removeFile();
      setTimeout(scrollToBottom, 0);
    }
  };

  const handleDocUpload = async (docToSend: File) => {
    setLoadingText("Đang tải lên dữ liệu...");
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: `Đã tải lên tài liệu: ${docToSend.name}` },
      { role: "bot", text: `Đã bắt đầu tiến trình trích xuất và embedding dữ liệu từ tệp '${docToSend.name}' trong nền.` }
    ]);
    try {
      const form = new FormData();
      form.append("file", docToSend);

      const res = await fetch("/api/ingest", {
        method: "POST",
        body: form,
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        throw new Error("thất bại - chưa đăng nhập");
      }
      if (!res.ok) {
        throw new Error("thất bại");
      }

      const data = await res.json();

      // Nếu có task_id từ backend mới, ta sẽ poll trạng thái
      if (data.task_id) {
        let isDone = false;
        while (!isDone) {
          await new Promise(r => setTimeout(r, 2000));
          const statusRes = await fetch(`/api/ingest/status?taskId=${data.task_id}`);
          if (!statusRes.ok) throw new Error("thất bại");
          const statusData = await statusRes.json();
          if (statusData.status === "success") {
            isDone = true;
          } else if (statusData.status === "failed") {
            throw new Error("thất bại");
          }
        }
      }

      setMessages((prev) => [...prev, { role: "bot", text: "Tiến trình thêm dữ liệu thành công." }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "bot", text: "Tiến trình thêm dữ liệu thất bại." }]);
    } finally {
      setLoading(false);
      if (docInputRef.current) docInputRef.current.value = "";
      setTimeout(scrollToBottom, 0);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSend && !file) return;
    await handleSendMessage(query, file);
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
      if (f.size > 5 * 1024 * 1024) {
        alert("Hình ảnh upload không được quá 5MB.");
        e.currentTarget.value = "";
        return;
      }
      setFile(f);
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const removeFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDocChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      const allowedExts = [".pdf", ".doc", ".docx"];
      const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
      if (!allowedExts.includes(ext)) {
        alert("Chỉ chấp nhận file PDF, DOC hoặc DOCX.");
        e.currentTarget.value = "";
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        alert("Tài liệu tải lên không được vượt quá 10MB.");
        e.currentTarget.value = "";
        return;
      }
      handleDocUpload(f);
    }
  };

  const triggerDocSelect = () => docInputRef.current?.click();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const getCookie = (name: string) => {
          if (typeof document === "undefined") return null;
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(";").shift();
          return null;
        };
        const token = getCookie("access_token");
        if (token) {
          const res = await fetch("http://localhost:8000/api/v1/auth/me", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setUserInfo(data);
          }
        }
      } catch (e) {
        console.error("Error fetching user profile for chat history:", e);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const key = userInfo ? `chat_messages_${userInfo.id}` : "chat_messages_guest";
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        } else {
          setMessages([
            {
              role: "bot",
              text: "Xin chào, tôi là AI LungCare. Tôi có thể giúp gì cho bạn về các bệnh lý phổi?",
            },
          ]);
        }
      } catch (e) {
        console.error("Lỗi đọc lịch sử chat:", e);
      }
    } else {
      setMessages([
        {
          role: "bot",
          text: "Xin chào, tôi là AI LungCare. Tôi có thể giúp gì cho bạn về các bệnh lý phổi?",
        },
      ]);
    }
    setLoadedUserKey(key);
  }, [userInfo]);

  useEffect(() => {
    const key = userInfo ? `chat_messages_${userInfo.id}` : "chat_messages_guest";
    if (loadedUserKey === key) {
      localStorage.setItem(key, JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages, loading, loadedUserKey, userInfo]);

  return (
    <>
      <main className="main">
        <div className="title-container">
          <h1 className="title">AI LungCare</h1>
          <p className="subtitle">Hệ thống Trí tuệ nhân tạo Chẩn đoán & Tư vấn Bệnh phổi</p>
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
                  <img src={message.imageUrl} alt="upload" style={{ maxWidth: "100%", width: 224, height: "auto", maxHeight: 224, objectFit: "cover", borderRadius: 12 }} />
                </div>
              )}
              <MarkdownText text={message.text} />
            </div>
          ))}
          {loading && <div className="message bot">{loadingText}</div>}
          <div ref={messagesEndRef} />
        </div>

        <div className="composer-container">
          <form className="composer" onSubmit={onSubmit}>
            <button type="button" className="icon-button" onClick={triggerFileSelect} title="Tải ảnh">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>

            <button type="button" className="icon-button" onClick={triggerDocSelect} title="Tải tài liệu (PDF, DOC)">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </button>

            {previewUrl && (
              <div className="inline-preview">
                <img src={previewUrl} alt="preview" />
                <button type="button" onClick={removeFile} className="inline-remove">×</button>
              </div>
            )}

            <div className="input-wrapper">
              <textarea
                ref={queryInputRef}
                className="input"
                rows={1}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nhập câu hỏi tại đây..."
                aria-label="Nội dung câu hỏi"
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              className={`icon-button send ${(canSend || file) && !streaming ? "active" : ""}`}
              disabled={streaming || (!canSend && !file)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg"
              onChange={onFileChange}
              style={{ display: "none" }}
            />

            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={onDocChange}
              style={{ display: "none" }}
            />
          </form>
        </div>
      </main>
    </>
  );
}
