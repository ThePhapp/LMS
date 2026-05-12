import React, { useState, useRef, useEffect, useContext } from 'react';
import { X, Send, Bot, User, Loader, Trash2, Sparkles } from 'lucide-react';
import { LangContext } from '../contexts/LangContext';
import { AuthContext } from '../contexts/AuthContext';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Bạn là trợ lý AI thông minh của hệ thống học trực tuyến Lớp Học Đổi Mới. Hãy giúp học viên và giáo viên với các câu hỏi về khóa học, học tập, lập trình, và các vấn đề học thuật. Trả lời ngắn gọn, dễ hiểu, thân thiện và chính xác. Hỗ trợ cả tiếng Việt và tiếng Anh.`;

export default function AiChat() {
  const { t, lang } = useContext(LangContext);
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Build conversation history for Gemini
    const contents = [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }],
      },
      {
        role: 'model',
        parts: [{ text: lang === 'vi' ? 'Xin chào! Tôi là trợ lý AI của Lớp Học Đổi Mới. Tôi có thể giúp gì cho bạn?' : 'Hello! I am Lớp Học Đổi Mới AI assistant. How can I help you?' }],
      },
      ...newMessages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
    ];

    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `HTTP ${res.status}`;
        setMessages((prev) => [
          ...prev,
          { role: 'model', text: lang === 'vi' ? `Lỗi: ${errMsg}` : `Error: ${errMsg}` },
        ]);
        return;
      }

      const data = await res.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        (lang === 'vi' ? 'Xin lỗi, tôi không thể trả lời lúc này.' : 'Sorry, I could not generate a response.');

      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      console.error('Gemini API error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: lang === 'vi'
            ? 'Đã xảy ra lỗi kết nối. Vui lòng thử lại.'
            : 'A connection error occurred. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => setMessages([]);

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <button
        className="ai-chat-fab"
        onClick={() => setOpen((o) => !o)}
        title={t('ai_chat_title') || 'AI Assistant'}
        aria-label="Open AI chat"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
        {!open && messages.length > 0 && (
          <span className="ai-chat-fab-badge">{messages.filter((m) => m.role === 'model').length}</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-chat-avatar">
                <Bot size={18} />
              </div>
              <div>
                <div className="ai-chat-header-title">
                  {t('ai_chat_title') || 'AI Assistant'}
                </div>
                <div className="ai-chat-header-subtitle">
                  Gemini · {loading ? (t('ai_chat_typing') || 'Typing...') : (t('ai_chat_online') || 'Online')}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {messages.length > 0 && (
                <button className="ai-chat-icon-btn" onClick={clearChat} title={t('ai_chat_clear') || 'Clear chat'}>
                  <Trash2 size={15} />
                </button>
              )}
              <button className="ai-chat-icon-btn" onClick={() => setOpen(false)} title="Close">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages">
            {messages.length === 0 && (
              <div className="ai-chat-empty">
                <div className="ai-chat-empty-icon">
                  <Sparkles size={32} />
                </div>
                <p className="ai-chat-empty-title">
                  {t('ai_chat_empty_title') || 'How can I help you?'}
                </p>
                <p className="ai-chat-empty-sub">
                  {t('ai_chat_empty_sub') || 'Ask me anything about your courses or studies.'}
                </p>
                <div className="ai-chat-suggestions">
                  {(lang === 'vi'
                    ? ['Học liệu điện tử là gì?', 'Học liệu điện tử có lợi gì?']
                    : ['Explain e-learning materials', 'What are the benefits of e-learning materials?']
                  ).map((s) => (
                    <button
                      key={s}
                      className="ai-chat-suggestion-btn"
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`ai-chat-msg ${msg.role === 'user' ? 'ai-chat-msg-user' : 'ai-chat-msg-model'}`}>
                {msg.role === 'model' && (
                  <div className="ai-chat-msg-avatar model-avatar">
                    <Bot size={14} />
                  </div>
                )}
                <div className="ai-chat-msg-bubble">
                  <MessageText text={msg.text} />
                </div>
                {msg.role === 'user' && (
                  <div className="ai-chat-msg-avatar user-avatar">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="ai-chat-msg ai-chat-msg-model">
                <div className="ai-chat-msg-avatar model-avatar">
                  <Bot size={14} />
                </div>
                <div className="ai-chat-msg-bubble ai-chat-typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="ai-chat-input-area">
            {!GEMINI_API_KEY && (
              <div className="ai-chat-api-warning">
                ⚠️ {lang === 'vi' ? 'Chưa cấu hình VITE_GEMINI_API_KEY' : 'VITE_GEMINI_API_KEY not configured'}
              </div>
            )}
            <div className="ai-chat-input-row">
              <textarea
                ref={inputRef}
                className="ai-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('ai_chat_placeholder') || 'Ask me anything... (Enter to send)'}
                rows={1}
                disabled={loading}
              />
              <button
                className="ai-chat-send-btn"
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                title="Send"
              >
                {loading ? <Loader size={18} className="ai-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Renders text with basic markdown: **bold**, `code`, newlines
function MessageText({ text }) {
  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return (
    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const inner = part.slice(3, -3).replace(/^[a-z]+\n/, '');
          return (
            <pre key={i} style={{
              background: 'rgba(0,0,0,0.07)',
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: '0.8rem',
              overflowX: 'auto',
              margin: '4px 0',
              fontFamily: 'monospace',
            }}>{inner}</pre>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} style={{
              background: 'rgba(0,0,0,0.08)',
              borderRadius: 4,
              padding: '1px 5px',
              fontFamily: 'monospace',
              fontSize: '0.85em',
            }}>{part.slice(1, -1)}</code>
          );
        }
        // Bold
        const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((bp, j) => {
          if (bp.startsWith('**') && bp.endsWith('**')) {
            return <strong key={j}>{bp.slice(2, -2)}</strong>;
          }
          return <span key={j}>{bp}</span>;
        });
      })}
    </span>
  );
}
