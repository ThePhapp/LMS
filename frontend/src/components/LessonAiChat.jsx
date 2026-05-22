import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { Send, Loader, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { MUSHROOM_KNOWLEDGE } from '../data/mushroomKnowledge';

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === 'send') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
      osc.onended = () => ctx.close();
    } else if (type === 'receive') {
      const notes = [523, 659, 784];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.13;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.start(t);
        osc.stop(t + 0.28);
      });
      setTimeout(() => ctx.close(), 1200);
    }
  } catch (_) {}
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function buildSystemPrompt(lesson, course) {
  const lessonTitle = lesson?.title || 'bài học này';
  const lessonContent = lesson?.content || '';
  const courseTitle = course?.title || '';

  return `Bạn là Miu - một bạn robot dễ thương, thông minh và rất yêu trẻ em! Bạn đang giúp các bạn học sinh tiểu học học bài "${lessonTitle}" trong khoá học "${courseTitle}".

Nội dung bài học:
${lessonContent || '(Chưa có mô tả chi tiết)'}

Dữ liệu tham khảo (Ưu tiên trả lời dựa theo dữ liệu này khi được hỏi):
${MUSHROOM_KNOWLEDGE}

Nhiệm vụ của bạn:

Giải thích kiến thức khoa học lớp 4 một cách dễ hiểu, ngắn gọn, chính xác và sinh động.
Hỗ trợ học sinh học chủ đề Nấm, bao gồm:
Bài 19: Đặc điểm chung của nấm
Bài 20: Nấm ăn và nấm trong chế biến thực phẩm
Bài 21: Nấm gây hỏng thực phẩm và nấm độc
Bài 22: Ôn tập chủ đề Nấm
Trả lời các câu hỏi liên quan đến đặc điểm, nơi sống, lợi ích, tác hại và ứng dụng của nấm trong đời sống.
Hỗ trợ học sinh ôn tập, củng cố kiến thức và tạo hứng thú học tập.

Yêu cầu khi trả lời:

Sử dụng tiếng Việt đơn giản, phù hợp với học sinh lớp 4.
Chỉ trả lời theo kiến thức Khoa học lớp 4.
Trả lời ngắn gọn, đúng trọng tâm, không lan man.
Ưu tiên cách giải thích giống sách giáo khoa tiểu học.
Dùng ví dụ gần gũi như gia đình, trường học, cây cối, thức ăn, thiên nhiên,...
Có thể dùng emoji vừa phải 🌟🍄✨ để giúp học sinh hứng thú hơn.
Nếu có từ khó, cần giải thích lại thật đơn giản.
Khi giải thích nên trình bày từng ý rõ ràng, dễ đọc.
Không dùng kiến thức quá nâng cao; nếu vượt chương trình lớp 4 thì nói nhẹ nhàng rằng nội dung đó sẽ học ở lớp lớn hơn.
Giữ giọng điệu thân thiện, nhẹ nhàng như cô giáo hoặc một người bạn học giỏi đang hướng dẫn.

Ví dụ cách trả lời:
Câu hỏi: “Nơi sống của nấm”
Trả lời:
“Nơi sống của nấm rất đa dạng và phong phú. Nấm thường sống ở nơi ẩm ướt và có nhiều chất dinh dưỡng như đất ẩm, gỗ mục, lá cây mục hoặc thức ăn để lâu ngày 🍄”

Quy tắc chào hỏi:

Nếu học sinh nói: “Xin chào”, “Chào”, “Hi”,...
thì trả lời:
“Chào em, em có thắc mắc gì không nào? 🌟”

Mục tiêu:
Giúp học sinh hiểu bài, yêu thích môn Khoa học, phát triển sự tò mò và hứng thú khám phá thế giới tự nhiên.`;
}

const SUGGESTIONS = [
  { emoji: '🤔', text: 'Bài này nói về chuyện gì vậy Miu?' },
  { emoji: '🌟', text: 'Cho mình ví dụ dễ hiểu hơn được không?' },
  { emoji: '💡', text: 'Phần quan trọng nhất là gì?' },
  { emoji: '🎯', text: 'Bài này dùng để làm gì trong cuộc sống?' },
];

export default function LessonAiChat({ lesson, course }) {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('miu_sound') !== 'off'; } catch { return true; }
  });
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const speechRef = useRef(null);
  const recognitionRef = useRef(null);
  const rvLoadedRef = useRef(false);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem('miu_sound', next ? 'on' : 'off'); } catch {}
      return next;
    });
  };

  const ensureResponsiveVoice = () => new Promise((resolve) => {
    if (window.responsiveVoice) { resolve(); return; }
    if (rvLoadedRef.current) {
      const t = setInterval(() => { if (window.responsiveVoice) { clearInterval(t); resolve(); } }, 100);
      return;
    }
    rvLoadedRef.current = true;
    const s = document.createElement('script');
    s.src = 'https://code.responsivevoice.org/responsivevoice.js?key=FREE';
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });

  const cleanForSpeech = (text) => text
    .replace(/```[\s\S]*?```/g, 'đoạn code')
    .replace(/`[^`]+`/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*#_~]/g, '')
    // Remove emoji surrogate pairs (emoji outside BMP)
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    // Remove misc symbol blocks (✅☑️⚡etc.)
    .replace(/[\u2300-\u27BF\u2B00-\u2BFF\u2600-\u26FF]/g, '')
    // Remove variation selectors
    .replace(/\uFE0F/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const speakText = async (text) => {
    window.speechSynthesis?.cancel();
    const clean = cleanForSpeech(text);
    if (!clean) return;
    try {
      await ensureResponsiveVoice();
      if (window.responsiveVoice) {
        window.responsiveVoice.cancel();
        window.responsiveVoice.speak(clean, 'Vietnamese Female', { rate: 0.95, pitch: 1, volume: 1 });
        return;
      }
    } catch (_) {}
    // Native fallback
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.startsWith('vi'));
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'vi-VN';
    utter.rate = 1.0;
    utter.pitch = 1.3;
    if (viVoice) utter.voice = viVoice;
    speechRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Trình duyệt chưa hỗ trợ nhận dạng giọng nói!'); return; }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = 'vi-VN';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      setInput(transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
  };

  // Reset chat when lesson changes
  useEffect(() => {
    setMessages([]);
    setInput('');
    window.speechSynthesis?.cancel();
    window.responsiveVoice?.cancel();
    recognitionRef.current?.stop();
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
    if (soundEnabled) playSound('send');

    const systemPrompt = buildSystemPrompt(lesson, course);

    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: `Xin chào bạn nhỏ! 👋 Mình là Miu - bạn robot siêu dễ thương của bài học "${lesson?.title || 'này'}" nè! Bạn có câu hỏi gì cứ hỏi Miu nhé! 🌟` }],
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
      if (soundEnabled) playSound('receive');
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

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      window.responsiveVoice?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  if (!user) return null;

  const canSend = !!input.trim() && !loading;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '560px',
      borderRadius: 24,
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #FFF9FE 0%, #F0F7FF 100%)',
      border: '3px solid #FFB3D9',
      boxShadow: '0 8px 32px rgba(255,107,157,0.15)',
      fontFamily: '"Nunito", "Segoe UI", sans-serif',
    }}>

      {/* ===== HEADER ===== */}
      <div style={{
        background: 'linear-gradient(135deg, #FF6B9D 0%, #FF8E53 100%)',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -12, right: 60, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ position: 'absolute', bottom: -8, right: 20, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1 }}>
          {/* Mascot */}
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem',
            boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
            flexShrink: 0,
            animation: 'miuBob 2s ease-in-out infinite',
          }}>
            🐱
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#fff', letterSpacing: 0.3 }}>
              Miu AI ✨
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
              {loading ? '🤔 Miu đang nghĩ...' : '🟢 Sẵn sàng giúp bạn!'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', zIndex: 1, alignItems: 'center' }}>
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            style={{
              background: 'rgba(255,255,255,0.25)',
              border: '2px solid rgba(255,255,255,0.4)',
              borderRadius: '50%',
              color: '#fff',
              cursor: 'pointer',
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              title="Bắt đầu lại"
              style={{
                background: 'rgba(255,255,255,0.25)',
                border: '2px solid rgba(255,255,255,0.4)',
                borderRadius: 20,
                color: '#fff',
                cursor: 'pointer',
                padding: '4px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              🔄 Làm mới
            </button>
          )}
        </div>
      </div>

      {/* ===== MESSAGES ===== */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: 'transparent',
      }}>

        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '0.75rem 0.5rem' }}>
            {/* Big mascot */}
            <div style={{
              fontSize: '4rem',
              marginBottom: '0.5rem',
              animation: 'miuBob 2s ease-in-out infinite',
              display: 'inline-block',
            }}>
              🐱
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 900,
              fontSize: '1.15rem',
              marginBottom: '0.25rem',
            }}>
              Chào bạn nhỏ! Miu đây 👋
            </div>
            <p style={{ fontSize: '0.88rem', color: '#888', marginBottom: '1rem', lineHeight: 1.6 }}>
              Bạn đang học bài<br />
              <strong style={{ color: '#FF6B9D' }}>"{lesson?.title}"</strong><br />
              Có gì không hiểu thì hỏi Miu nhé! 😊
            </p>

            {/* Suggestion chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.text)}
                  style={{
                    background: '#fff',
                    border: '2px solid #FFD6E8',
                    borderRadius: 16,
                    padding: '0.6rem 1rem',
                    fontSize: '0.85rem',
                    color: '#FF6B9D',
                    cursor: 'pointer',
                    fontWeight: 700,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s',
                    boxShadow: '0 2px 6px rgba(255,107,157,0.1)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF0F6'; e.currentTarget.style.borderColor = '#FF6B9D'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#FFD6E8'; }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{s.emoji}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'flex-end',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #4ECDC4, #44A08D)'
                : 'linear-gradient(135deg, #FFB3D9, #FF6B9D)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              border: '2px solid #fff',
            }}>
              {msg.role === 'user' ? '👦' : '🐱'}
            </div>

            {/* Bubble */}
            <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #4ECDC4, #44A08D)'
                  : '#fff',
                color: msg.role === 'user' ? '#fff' : '#333',
                borderRadius: msg.role === 'user' ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                padding: '0.7rem 1rem',
                fontSize: '0.92rem',
                lineHeight: 1.65,
                boxShadow: msg.role === 'user'
                  ? '0 4px 12px rgba(78,205,196,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.08)',
                border: msg.role === 'model' ? '2px solid #FFE4F0' : 'none',
              }}>
                <MessageText text={msg.text} />
              </div>
              {msg.role === 'model' && (
                <button
                  onClick={() => speakText(msg.text)}
                  title="Nghe Miu đọc"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#FF6B9D', padding: '2px 6px', marginTop: 3,
                    display: 'flex', alignItems: 'center', gap: 3,
                    fontSize: '0.72rem', fontWeight: 700, opacity: 0.75,
                    borderRadius: 8,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.75'}
                >
                  <Volume2 size={12} /> Giọng nói
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFB3D9, #FF6B9D)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', border: '2px solid #fff',
            }}>🐱</div>
            <div style={{
              background: '#fff', border: '2px solid #FFE4F0',
              borderRadius: '20px 20px 20px 6px',
              padding: '0.75rem 1rem',
              display: 'flex', gap: 5, alignItems: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}>
              {[0, 1, 2].map((d) => (
                <span key={d} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#FF6B9D',
                  animation: `lessonAiDot 1.2s ${d * 0.2}s infinite ease-in-out`,
                  display: 'inline-block',
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ===== INPUT ===== */}
      <div style={{
        borderTop: '2px solid #FFE4F0',
        padding: '0.75rem',
        background: '#fff',
        flexShrink: 0,
      }}>
        {!GEMINI_API_KEY && (
          <div style={{
            background: '#FEF3C7', border: '2px solid #F59E0B', borderRadius: 12,
            padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#92400E',
            marginBottom: '0.5rem', fontWeight: 600,
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
            placeholder="Hỏi Miu bất cứ điều gì về bài học..."
            rows={1}
            disabled={loading}
            style={{
              flex: 1,
              resize: 'none',
              border: '2px solid #FFD6E8',
              borderRadius: 20,
              padding: '0.6rem 1rem',
              fontSize: '0.92rem',
              background: '#FFF9FE',
              color: '#333',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              maxHeight: 100,
              overflow: 'auto',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#FF6B9D'; }}
            onBlur={(e) => { e.target.style.borderColor = '#FFD6E8'; }}
          />
          <button
            onClick={startListening}
            title={isListening ? 'Dừng ghi âm' : 'Nói với Miu'}
            style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: isListening
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : '#F3E8F0',
              border: 'none',
              cursor: 'pointer',
              color: isListening ? '#fff' : '#FF6B9D',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isListening ? '0 4px 12px rgba(239,68,68,0.4)' : 'none',
              transition: 'all 0.2s',
              animation: isListening ? 'miuPulse 1s ease-in-out infinite' : 'none',
            }}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button
            onClick={() => sendMessage()}
            disabled={!canSend}
            title="Gửi cho Miu!"
            style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: canSend
                ? 'linear-gradient(135deg, #FF6B9D, #FF8E53)'
                : '#F3E8F0',
              border: 'none',
              cursor: canSend ? 'pointer' : 'not-allowed',
              color: canSend ? '#fff' : '#ccc',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: canSend ? '0 4px 12px rgba(255,107,157,0.4)' : 'none',
              transition: 'all 0.2s',
              fontSize: '1rem',
            }}
          >
            {loading
              ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={18} />
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes lessonAiDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes miuBob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes miuPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(239,68,68,0.4); }
          50% { transform: scale(1.08); box-shadow: 0 4px 20px rgba(239,68,68,0.7); }
        }
      `}</style>
    </div>
  );
}

function MessageText({ text }) {
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return (
    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.92rem', lineHeight: 1.7 }}>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const inner = part.slice(3, -3).replace(/^[a-z]+\n/, '');
          return (
            <pre key={i} style={{
              background: 'rgba(0,0,0,0.06)', borderRadius: 10,
              padding: '8px 12px', fontSize: '0.82rem',
              overflowX: 'auto', margin: '6px 0', fontFamily: 'monospace',
              border: '1px solid rgba(0,0,0,0.08)',
            }}>{inner}</pre>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} style={{
              background: 'rgba(255,107,157,0.12)', borderRadius: 5,
              padding: '2px 6px', fontFamily: 'monospace', fontSize: '0.85em',
              color: '#FF6B9D',
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
