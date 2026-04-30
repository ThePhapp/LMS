import React, { useState, useRef, useEffect, useContext } from 'react';
import { Send, Bot, User, Loader, Trash2, Sparkles } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function buildSystemPrompt(lesson, course) {
  const lessonTitle = lesson?.title || 'bài học này';
  const lessonContent = lesson?.content || '';
  const courseTitle = course?.title || '';

  return `Bạn là trợ lý AI chuyên biệt cho bài học "${lessonTitle}" thuộc khoá học "${courseTitle}" trên hệ thống VanAnh LMS.

Nội dung bài học:
${lessonContent || '(Chưa có mô tả chi tiết)'}

Nhiệm vụ của bạn:
- Chỉ trả lời các câu hỏi liên quan đến bài học này và chủ đề của khoá học.
- Giải thích các khái niệm trong bài học một cách rõ ràng, dễ hiểu.
- Đưa ra ví dụ minh hoạ khi cần thiết.
- Nếu câu hỏi hoàn toàn không liên quan đến bài học, hãy nhẹ nhàng hướng học sinh trở lại chủ đề bài học.
- Hỗ trợ cả tiếng Việt và tiếng Anh.
- Trả lời thân thiện, ngắn gọn và chính xác.`;
}

const SUGGESTIONS = [
  'Giải thích lại nội dung chính của bài này?',
  'Cho tôi ví dụ về kiến thức trong bài?',
  'Tôi cần lưu ý gì quan trọng nhất?',
  'Bài này liên quan đến gì trong thực tế?',
];

export default function LessonAiChat({ lesson, course }) {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Reset chat when lesson changes
  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [lesson?.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', text: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const systemPrompt = buildSystemPrompt(lesson, course);

    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: `Xin chào! Tôi là trợ lý AI cho bài học "${lesson?.title || 'này'}". Bạn có thắc mắc gì về bài học, hãy hỏi tôi nhé!` }],
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
        setMessages((prev) => [...prev, { role: 'model', text: `Lỗi: ${errMsg}` }]);
        return;
      }

      const data = await res.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Xin lỗi, tôi không thể trả lời lúc này.';

      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (err) {
      console.error('Gemini API error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'Đã xảy ra lỗi kết nối. Vui lòng thử lại.' },
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

  if (!user) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '520px',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      background: 'var(--surface)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.875rem 1.25rem',
        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
        color: '#fff',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>AI Trợ lý bài học</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
              {loading ? 'Đang trả lời...' : `Hỏi về: ${lesson?.title || 'bài học này'}`}
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            title="Xoá cuộc trò chuyện"
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6,
              color: '#fff', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: '0.75rem',
            }}
          >
            <Trash2 size={13} /> Xoá
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <Bot size={28} color="#7c3aed" />
            </div>
            <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
              Chào bạn! Tôi là AI Trợ lý 👋
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Hỏi tôi bất cứ điều gì liên quan đến bài học <strong>"{lesson?.title}"</strong>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  style={{
                    background: 'var(--primary-light)',
                    border: '1px solid var(--primary)',
                    borderRadius: 20,
                    padding: '0.35rem 0.875rem',
                    fontSize: '0.8rem',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'var(--transition)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-end',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: msg.role === 'user' ? 'var(--primary)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}>
              {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
            </div>
            <div style={{
              maxWidth: '78%',
              background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg)',
              color: msg.role === 'user' ? '#fff' : 'var(--text)',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding: '0.6rem 0.875rem',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              border: msg.role === 'model' ? '1px solid var(--border)' : 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <MessageText text={msg.text} />
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}>
              <Bot size={13} />
            </div>
            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: '18px 18px 18px 4px', padding: '0.6rem 0.875rem',
              display: 'flex', gap: 4, alignItems: 'center',
            }}>
              {[0, 1, 2].map((d) => (
                <span key={d} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#7c3aed', opacity: 0.7,
                  animation: `lessonAiDot 1.2s ${d * 0.2}s infinite ease-in-out`,
                  display: 'inline-block',
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '0.75rem',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        {!GEMINI_API_KEY && (
          <div style={{
            background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8,
            padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#92400E',
            marginBottom: '0.5rem',
          }}>
            ⚠️ Chưa cấu hình VITE_GEMINI_API_KEY
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi về bài học này... (Enter để gửi)"
            rows={1}
            disabled={loading}
            style={{
              flex: 1,
              resize: 'none',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '0.55rem 1rem',
              fontSize: '0.9rem',
              background: 'var(--bg)',
              color: 'var(--text)',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              maxHeight: 100,
              overflow: 'auto',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            title="Gửi"
            style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: !input.trim() || loading ? 'var(--border)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'var(--transition)',
            }}
          >
            {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes lessonAiDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function MessageText({ text }) {
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return (
    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const inner = part.slice(3, -3).replace(/^[a-z]+\n/, '');
          return (
            <pre key={i} style={{
              background: 'rgba(0,0,0,0.07)', borderRadius: 6,
              padding: '8px 10px', fontSize: '0.8rem',
              overflowX: 'auto', margin: '4px 0', fontFamily: 'monospace',
            }}>{inner}</pre>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} style={{
              background: 'rgba(0,0,0,0.08)', borderRadius: 4,
              padding: '1px 5px', fontFamily: 'monospace', fontSize: '0.85em',
            }}>{part.slice(1, -1)}</code>
          );
        }
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
