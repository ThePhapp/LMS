import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { assetUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { ArrowLeft, Download, Link2 } from 'lucide-react';
import AssignmentViewer from '../components/AssignmentViewer';
import { Confetti, LessonCompleteToast } from '../components/FunElements';
import LessonAiChat from '../components/LessonAiChat';

function getYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?/\s]{11})/);
  return match ? match[1] : null;
}

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return d.toLocaleDateString('vi-VN');
}

const CourseLearning = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState(null);
  const [progress, setProgress] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

  const [notes, setNotes] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [showCompleteToast, setShowCompleteToast] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchCourseAndProgress();
  }, [id, user]);

  useEffect(() => {
    if (activeLesson) {
      setReplyingTo(null);
      setReplyContent('');
      if (activeLesson.item_type === 'assignment') {
        fetchFullAssignment(activeLesson.id);
      } else {
        fetchNotes();
        fetchComments();
      }
    }
  }, [activeLesson?.id, activeLesson?.item_type]);

  const fetchFullAssignment = async (assignmentId) => {
    try {
      const res = await api.get(`/assignments/${assignmentId}`);
      setActiveLesson(prev => ({ ...prev, ...res.data, item_type: 'assignment' }));
    } catch { }
  };

  const fetchCourseAndProgress = async () => {
    try {
      // Must be enrolled or owner
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data);
      if (res.data.lessons?.length > 0) setActiveLesson(res.data.lessons[0]);

      if (user?.role === 'student') {
        const progRes = await api.get(`/lessons/progress/${id}`);
        const map = {};
        progRes.data.forEach(p => { map[p.lesson_id] = p.completed; });
        setProgress(map);
      }
    } catch {
      navigate(`/courses/${id}`); // fallback if error / no access
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const res = await api.get(`/interactions/notes/${activeLesson.id}`);
      setNotes(res.data.content || '');
    } catch { } 
  };

  const fetchComments = async () => {
    try {
      const res = await api.get(`/interactions/comments/${activeLesson.id}`);
      setComments(res.data || []);
    } catch { }
  };

  const saveNotes = async () => {
    try {
      await api.post(`/interactions/notes/${activeLesson.id}`, { content: notes });
    } catch(err) {
      alert('Failed to save note');
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/interactions/comments/${activeLesson.id}`, { content: newComment });
      setComments(prev => [res.data, ...prev]);
      setNewComment('');
    } catch {
      alert('Failed to post comment');
    }
  };

  const submitReply = async (e, parentId) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    try {
      const res = await api.post(`/interactions/comments/${activeLesson.id}`, { content: replyContent, parent_id: parentId });
      setComments(prev => [...prev, res.data]);
      setReplyContent('');
      setReplyingTo(null);
    } catch {
      alert('Failed to post reply');
    }
  };

  const toggleProgress = async (lessonId, current) => {
    try {
      await api.post('/lessons/progress', { lesson_id: lessonId, completed: !current });
      setProgress(p => ({ ...p, [lessonId]: !current }));
      if (!current) {
        setShowCompleteToast(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3500);
      }
    } catch { }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 70px)', background: 'linear-gradient(180deg,#FFF9FE,#F0F7FF)', gap: '1rem' }}>
      <div style={{ fontSize: '3rem', animation: 'miuBob 1.2s ease-in-out infinite' }}>🐱</div>
      <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#FF6B9D' }}>Miu đang tải bài học...</p>
      <style>{`@keyframes miuBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
    </div>
  );
  if (!course) return null;

  const lessons = course.lessons || [];
  const completedCount = lessons.filter(l => progress[l.id]).length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const ytId = activeLesson ? getYoutubeId(activeLesson.video_url) : null;

  /* ---- helpers ---- */
  const CUTE_TAB_STYLE = (key) => ({
    padding: '0.55rem 1.1rem',
    borderRadius: 20,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.88rem',
    transition: 'all 0.18s',
    display: 'flex', alignItems: 'center', gap: 5,
    background: activeTab === key ? 'linear-gradient(135deg,#FF6B9D,#FF8E53)' : '#fff',
    color: activeTab === key ? '#fff' : '#999',
    boxShadow: activeTab === key ? '0 4px 12px rgba(255,107,157,0.35)' : '0 1px 4px rgba(0,0,0,0.08)',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', fontFamily: '"Nunito","Segoe UI",sans-serif' }}>

      {/* ===== TOP BAR ===== */}
      <div style={{
        background: 'linear-gradient(135deg,#FF6B9D 0%,#FF8E53 50%,#FFD93D 100%)',
        color: '#fff', padding: '0.75rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        {/* decorative stars */}
        {['⭐','✨','🌟','💫','⭐'].map((s,i) => (
          <span key={i} style={{ position:'absolute', top: i%2===0?4:14, left:`${8+i*18}%`, fontSize:'0.8rem', opacity:0.5, pointerEvents:'none' }}>{s}</span>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1 }}>
          <button
            onClick={() => navigate(`/courses/${id}`)}
            style={{ background:'rgba(255,255,255,0.25)', border:'2px solid rgba(255,255,255,0.4)', borderRadius:20, color:'#fff', cursor:'pointer', padding:'0.3rem 0.875rem', fontWeight:700, fontSize:'0.85rem', display:'flex', alignItems:'center', gap:5 }}
          >
            <ArrowLeft size={15}/> Quay lại
          </button>
          <div style={{ fontWeight: 900, fontSize: '1.1rem', textShadow:'0 1px 4px rgba(0,0,0,0.12)' }}>
            📚 {course.title}
          </div>
        </div>
        {user?.role === 'student' && (
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', minWidth:280, zIndex:1 }}>
            <span style={{ fontSize:'0.8rem', fontWeight:700, opacity:0.9, whiteSpace:'nowrap' }}>
              🏆 {completedCount}/{lessons.length} bài
            </span>
            <div style={{ flex:1, height:12, background:'rgba(255,255,255,0.3)', borderRadius:10, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${progressPct}%`, background:'#fff', borderRadius:10, transition:'width 0.5s ease', boxShadow:'0 0 8px rgba(255,255,255,0.6)' }} />
            </div>
            <span style={{ fontSize:'0.8rem', fontWeight:900, opacity:0.95 }}>{progressPct}%</span>
          </div>
        )}
      </div>

      {/* ===== MAIN LAYOUT ===== */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* ===== LEFT: CONTENT ===== */}
        <div style={{ flex:1, overflowY:'auto', background:'linear-gradient(180deg,#FFF9FE 0%,#F5F0FF 100%)', padding:'1.75rem 2rem' }}>
          {activeLesson ? (
            <div style={{ maxWidth:'1000px', margin:'0 auto' }}>

              {/* Lesson title card */}
              <div style={{
                background:'linear-gradient(135deg,#FFE4F0,#FFF0D6)',
                border:'2px solid #FFB3D9', borderRadius:20,
                padding:'1rem 1.5rem', marginBottom:'1.5rem',
                display:'flex', justifyContent:'space-between', alignItems:'center',
                boxShadow:'0 4px 16px rgba(255,107,157,0.1)',
              }}>
                <div>
                  <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#FF6B9D', marginBottom:4, letterSpacing:0.5 }}>
                    📖 BÀI HỌC
                  </div>
                  <h2 style={{ fontSize:'1.5rem', fontWeight:900, color:'#333', margin:0 }}>
                    {activeLesson.title}
                  </h2>
                </div>
                {user?.role === 'student' && activeLesson.item_type !== 'assignment' && (
                  <button
                    onClick={() => toggleProgress(activeLesson.id, progress[activeLesson.id])}
                    style={{
                      background: progress[activeLesson.id]
                        ? 'linear-gradient(135deg,#43e97b,#38f9d7)'
                        : 'linear-gradient(135deg,#FF6B9D,#FF8E53)',
                      border:'none', borderRadius:20, color:'#fff',
                      padding:'0.6rem 1.25rem', fontWeight:800, fontSize:'0.9rem',
                      cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
                      boxShadow: progress[activeLesson.id]
                        ? '0 4px 14px rgba(67,233,123,0.4)'
                        : '0 4px 14px rgba(255,107,157,0.4)',
                      transition:'all 0.2s',
                    }}
                  >
                    {progress[activeLesson.id] ? '✅ Xong rồi!' : '🎯 Hoàn thành!'}
                  </button>
                )}
              </div>

              {/* ---- VIEWERS ---- */}
              {activeLesson.item_type === 'assignment' ? (
                <div style={{ background:'#fff', border:'2px solid #FFB3D9', borderRadius:20, padding:'1.5rem', boxShadow:'0 4px 16px rgba(255,107,157,0.08)' }}>
                  <AssignmentViewer assignment={activeLesson} onSubmissionSuccess={() => fetchFullAssignment(activeLesson.id)} />
                </div>
              ) : (
                <>
                  {ytId && (
                    <div className="video-embed" style={{ borderRadius:20, overflow:'hidden', boxShadow:'0 8px 30px rgba(255,107,157,0.2)', border:'3px solid #FFB3D9', marginBottom:'1.5rem' }}>
                      <iframe src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen title={activeLesson.title} style={{ border:'none' }} />
                    </div>
                  )}

                  {!ytId && activeLesson.file_type === 'video' && activeLesson.file_url && (
                    <div className="video-embed" style={{ borderRadius:20, overflow:'hidden', boxShadow:'0 8px 30px rgba(255,107,157,0.2)', border:'3px solid #FFB3D9', marginBottom:'1.5rem' }}>
                      <video controls style={{ width:'100%', height:'100%' }}>
                        <source src={assetUrl(activeLesson.file_url)} />
                      </video>
                    </div>
                  )}

                  {activeLesson.video_url && !ytId && (
                    <div style={{ background:'#E0F7FA', border:'2px solid #80DEEA', borderRadius:16, padding:'1rem 1.25rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'1rem' }}>
                      <span style={{ fontSize:'2rem' }}>🎬</span>
                      <div>
                        <div style={{ fontWeight:700, marginBottom:4, color:'#006064' }}>Video bên ngoài</div>
                        <a href={activeLesson.video_url} target="_blank" rel="noopener noreferrer"
                          style={{ background:'#006064', color:'#fff', padding:'0.35rem 1rem', borderRadius:20, textDecoration:'none', fontWeight:700, fontSize:'0.85rem', display:'inline-flex', alignItems:'center', gap:5 }}>
                          <Link2 size={13}/> Mở Video
                        </a>
                      </div>
                    </div>
                  )}

                  {activeLesson.file_url && activeLesson.file_type !== 'video' && (
                    <>
                      {activeLesson.file_type === 'pdf' ? (
                        <div style={{ marginBottom:'1.5rem' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                            <div style={{ fontWeight:700, fontSize:'1rem', color:'#e53e3e' }}>
                              📄 {activeLesson.file_name || 'Tài liệu PDF'}
                            </div>
                            <a href={assetUrl(activeLesson.file_url)} download
                              style={{ background:'linear-gradient(135deg,#667eea,#764ba2)', color:'#fff', padding:'0.35rem 1rem', borderRadius:20, textDecoration:'none', fontWeight:700, fontSize:'0.82rem', display:'inline-flex', alignItems:'center', gap:5 }}>
                              <Download size={13}/> Tải xuống
                            </a>
                          </div>
                          <div style={{ width:'100%', height:'600px', border:'2px solid #FFB3D9', borderRadius:16, overflow:'hidden', boxShadow:'0 8px 24px rgba(255,107,157,0.12)' }}>
                            <iframe src={`${assetUrl(activeLesson.file_url)}#view=FitH`} style={{ width:'100%', height:'100%', border:'none' }} title="PDF Viewer" />
                          </div>
                        </div>
                      ) : (['pptx','ppt','docx','doc','xlsx','xls'].includes(activeLesson.file_type) || /\.(pptx?|docx?|xlsx?)$/i.test(activeLesson.file_url)) ? (() => {
                        const fullUrl = assetUrl(activeLesson.file_url);
                        const isLocal = fullUrl.includes('localhost') || fullUrl.includes('127.0.0.1');
                        const isPpt = ['pptx','ppt'].includes(activeLesson.file_type) || /\.pptx?$/i.test(activeLesson.file_url);
                        const isDoc = ['docx','doc'].includes(activeLesson.file_type) || /\.docx?$/i.test(activeLesson.file_url);
                        const icon = isPpt ? '📊' : isDoc ? '📝' : '📈';
                        const label = isPpt ? 'Bài trình chiếu' : isDoc ? 'Tài liệu Word' : 'Bảng tính Excel';
                        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
                        return (
                          <div style={{ marginBottom:'1.5rem' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                              <div style={{ fontWeight:700, fontSize:'1rem' }}>{icon} {activeLesson.file_name || label}</div>
                              <a href={fullUrl} download
                                style={{ background:'linear-gradient(135deg,#667eea,#764ba2)', color:'#fff', padding:'0.35rem 1rem', borderRadius:20, textDecoration:'none', fontWeight:700, fontSize:'0.82rem', display:'inline-flex', alignItems:'center', gap:5 }}>
                                <Download size={13}/> Tải xuống
                              </a>
                            </div>
                            {isLocal ? (
                              <div style={{ background:'#FEF3C7', border:'2px solid #F59E0B', borderRadius:16, padding:'1.25rem', display:'flex', gap:'1rem', alignItems:'center' }}>
                                <span style={{ fontSize:'2rem' }}>{icon}</span>
                                <div>
                                  <div style={{ fontWeight:700, marginBottom:4 }}>Xem trước không khả dụng trên localhost</div>
                                  <div style={{ fontSize:'0.85rem', color:'#92400E' }}>Cần triển khai lên server. Hãy tải xuống để xem trên máy.</div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ width:'100%', height:'700px', border:'2px solid #FFB3D9', borderRadius:16, overflow:'hidden', boxShadow:'0 8px 24px rgba(255,107,157,0.12)', background:'#f1f5f9' }}>
                                <iframe src={officeViewerUrl} style={{ width:'100%', height:'100%', border:'none' }} title={label} allowFullScreen />
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        <div style={{ background:'#EDE9FE', border:'2px solid #c4b5fd', borderRadius:16, padding:'1rem 1.25rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'1rem' }}>
                          <span style={{ fontSize:'2rem' }}>📝</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, marginBottom:4 }}>{activeLesson.file_name || 'Tài liệu'}</div>
                            <a href={assetUrl(activeLesson.file_url)} download
                              style={{ background:'linear-gradient(135deg,#667eea,#764ba2)', color:'#fff', padding:'0.35rem 1rem', borderRadius:20, textDecoration:'none', fontWeight:700, fontSize:'0.82rem', display:'inline-flex', alignItems:'center', gap:5 }}>
                              <Download size={13}/> Tải xuống
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ---- CUTE TABS ---- */}
                  <div style={{ marginTop:'2rem', display:'flex', flexWrap:'wrap', gap:'0.5rem', padding:'0.75rem', background:'#fff', borderRadius:20, border:'2px solid #FFE4F0', boxShadow:'0 2px 8px rgba(255,107,157,0.08)' }}>
                    <button style={CUTE_TAB_STYLE('overview')} onClick={() => setActiveTab('overview')}>📖 Tổng quan</button>
                    {user?.role === 'student' && <button style={CUTE_TAB_STYLE('notes')} onClick={() => setActiveTab('notes')}>📝 Ghi chú</button>}
                    <button style={CUTE_TAB_STYLE('comments')} onClick={() => setActiveTab('comments')}>💬 Hỏi đáp</button>
                    <button style={CUTE_TAB_STYLE('ai')} onClick={() => setActiveTab('ai')}>🐱 Học Cùng Miu</button>
                  </div>

                  <div style={{ marginTop:'1.25rem', minHeight:'300px' }}>

                    {/* Overview */}
                    {activeTab === 'overview' && (
                      <div style={{ background:'#fff', border:'2px solid #FFE4F0', borderRadius:20, padding:'1.5rem', boxShadow:'0 4px 16px rgba(255,107,157,0.06)', fontSize:'1rem', lineHeight:1.9, color:'#444', whiteSpace:'pre-wrap' }}>
                        {activeLesson.content || (
                          <div style={{ textAlign:'center', padding:'2rem', color:'#ccc' }}>
                            <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>📭</div>
                            <div style={{ fontWeight:700 }}>Chưa có mô tả cho bài học này.</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {activeTab === 'notes' && user?.role === 'student' && (
                      <div style={{ background:'#fff', border:'2px solid #FFE4F0', borderRadius:20, padding:'1.5rem', boxShadow:'0 4px 16px rgba(255,107,157,0.06)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                          <p style={{ fontSize:'0.9rem', color:'#aaa', fontWeight:600 }}>📓 Ghi chú riêng tư của bạn</p>
                          <button
                            onClick={saveNotes}
                            style={{ background:'linear-gradient(135deg,#FF6B9D,#FF8E53)', border:'none', borderRadius:20, color:'#fff', padding:'0.4rem 1rem', fontWeight:800, fontSize:'0.85rem', cursor:'pointer', boxShadow:'0 3px 10px rgba(255,107,157,0.3)' }}
                          >
                            💾 Lưu ghi chú
                          </button>
                        </div>
                        <textarea
                          rows={8}
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Viết ghi chú của bạn vào đây nhé... ✏️"
                          style={{ width:'100%', border:'2px solid #FFD6E8', borderRadius:14, padding:'0.875rem 1rem', fontSize:'0.95rem', fontFamily:'inherit', outline:'none', resize:'vertical', background:'#FFF9FE', color:'#333', lineHeight:1.7, boxSizing:'border-box' }}
                        />
                      </div>
                    )}

                    {/* AI Chat */}
                    {activeTab === 'ai' && (
                      <LessonAiChat lesson={activeLesson} course={course} />
                    )}

                    {/* Comments */}
                    {activeTab === 'comments' && (
                      <div style={{ background:'#fff', border:'2px solid #FFE4F0', borderRadius:20, padding:'1.5rem', boxShadow:'0 4px 16px rgba(255,107,157,0.06)' }}>
                        {/* Write comment */}
                        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', marginBottom:'1.5rem' }}>
                          <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B9D,#FF8E53)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'1rem', flexShrink:0, boxShadow:'0 3px 8px rgba(255,107,157,0.3)' }}>
                            {user?.name?.[0]?.toUpperCase() || '👦'}
                          </div>
                          <form onSubmit={submitComment} style={{ flex:1, display:'flex', gap:'0.5rem', alignItems:'center' }}>
                            <input
                              type="text"
                              value={newComment}
                              onChange={e => setNewComment(e.target.value)}
                              placeholder="Hỏi gì đó đi bạn ơi! 🙋"
                              style={{ flex:1, border:'2px solid #FFD6E8', borderRadius:20, padding:'0.55rem 1rem', fontSize:'0.92rem', outline:'none', fontFamily:'inherit', background:'#FFF9FE', color:'#333' }}
                            />
                            {newComment.trim() && (
                              <button type="submit"
                                style={{ background:'linear-gradient(135deg,#FF6B9D,#FF8E53)', border:'none', borderRadius:20, color:'#fff', padding:'0.55rem 1.1rem', fontWeight:800, fontSize:'0.85rem', cursor:'pointer', whiteSpace:'nowrap', boxShadow:'0 3px 10px rgba(255,107,157,0.3)' }}>
                                Gửi 🚀
                              </button>
                            )}
                          </form>
                        </div>
                        {/* Comments list */}
                        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                          {comments.filter(c => !c.parent_id).map(c => {
                            const replies = comments.filter(r => r.parent_id === c.id);
                            const isReplying = replyingTo === c.id;
                            const colors = ['#FF6B9D','#FF8E53','#FFD93D','#6BCB77','#4D96FF'];
                            const color = colors[c.user_name.charCodeAt(0) % colors.length];
                            return (
                              <div key={c.id}>
                                <div style={{ display:'flex', gap:'0.6rem', alignItems:'flex-start' }}>
                                  <div style={{ width:40, height:40, borderRadius:'50%', background:`linear-gradient(135deg,${color},${color}aa)`, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.95rem', flexShrink:0, boxShadow:`0 3px 8px ${color}40` }}>
                                    {c.user_name[0].toUpperCase()}
                                  </div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ background:'#FFF9FE', border:'2px solid #FFE4F0', borderRadius:'0 16px 16px 16px', padding:'0.65rem 1rem', display:'inline-block', maxWidth:'100%' }}>
                                      <div style={{ fontWeight:800, fontSize:'0.85rem', color, marginBottom:2 }}>{c.user_name}</div>
                                      <div style={{ fontSize:'0.95rem', color:'#444' }}>{c.content}</div>
                                    </div>
                                    <div style={{ display:'flex', gap:'1rem', marginTop:'0.3rem', paddingLeft:'0.5rem', alignItems:'center' }}>
                                      <span style={{ fontSize:'0.73rem', color:'#bbb', fontWeight:600 }}>{timeAgo(c.created_at)}</span>
                                      <button
                                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.75rem', fontWeight:800, color: isReplying ? '#FF6B9D' : '#ccc', padding:0 }}
                                        onClick={() => { setReplyingTo(isReplying ? null : c.id); setReplyContent(''); }}
                                      >💬 Phản hồi</button>
                                    </div>
                                    {/* Replies */}
                                    {replies.length > 0 && (
                                      <div style={{ marginTop:'0.75rem', marginLeft:'0.75rem', display:'flex', flexDirection:'column', gap:'0.6rem', borderLeft:'3px solid #FFD6E8', paddingLeft:'0.75rem' }}>
                                        {replies.map(r => {
                                          const rc = colors[r.user_name.charCodeAt(0) % colors.length];
                                          return (
                                            <div key={r.id} style={{ display:'flex', gap:'0.5rem', alignItems:'flex-start' }}>
                                              <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${rc},${rc}aa)`, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.82rem', flexShrink:0 }}>
                                                {r.user_name[0].toUpperCase()}
                                              </div>
                                              <div style={{ flex:1 }}>
                                                <div style={{ background:'#FFF0F6', border:'2px solid #FFD6E8', borderRadius:'0 14px 14px 14px', padding:'0.5rem 0.875rem', display:'inline-block', maxWidth:'100%' }}>
                                                  <div style={{ fontWeight:800, fontSize:'0.8rem', color:rc, marginBottom:2 }}>{r.user_name}</div>
                                                  <div style={{ fontSize:'0.9rem', color:'#444' }}>{r.content}</div>
                                                </div>
                                                <div style={{ fontSize:'0.7rem', color:'#bbb', marginTop:'0.2rem', paddingLeft:'0.5rem', fontWeight:600 }}>{timeAgo(r.created_at)}</div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {/* Reply input */}
                                    {isReplying && (
                                      <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.75rem', alignItems:'center', marginLeft:'0.75rem' }}>
                                        <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B9D,#FF8E53)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.82rem', flexShrink:0 }}>
                                          {user?.name?.[0]?.toUpperCase() || '😊'}
                                        </div>
                                        <form onSubmit={(e) => submitReply(e, c.id)} style={{ flex:1, display:'flex', gap:'0.5rem', alignItems:'center' }}>
                                          <input
                                            type="text"
                                            value={replyContent}
                                            onChange={e => setReplyContent(e.target.value)}
                                            placeholder={`Phản hồi ${c.user_name}... 💬`}
                                            autoFocus
                                            style={{ flex:1, border:'2px solid #FFD6E8', borderRadius:20, padding:'0.4rem 0.875rem', fontSize:'0.88rem', outline:'none', fontFamily:'inherit', background:'#FFF9FE' }}
                                          />
                                          {replyContent.trim() && (
                                            <button type="submit"
                                              style={{ background:'linear-gradient(135deg,#FF6B9D,#FF8E53)', border:'none', borderRadius:20, color:'#fff', padding:'0.4rem 0.875rem', fontWeight:800, fontSize:'0.82rem', cursor:'pointer', whiteSpace:'nowrap' }}>
                                              Gửi 🚀
                                            </button>
                                          )}
                                        </form>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {comments.filter(c => !c.parent_id).length === 0 && (
                            <div style={{ textAlign:'center', padding:'2rem 0', color:'#ccc' }}>
                              <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>🙋</div>
                              <div style={{ fontWeight:700 }}>Chưa có câu hỏi nào. Hãy là người đầu tiên hỏi!</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ---- NAV BUTTONS ---- */}
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:'2.5rem', paddingTop:'1.5rem', borderTop:'2px dashed #FFD6E8' }}>
                    {(() => {
                      const idx = lessons.findIndex(l => l.id === activeLesson.id);
                      const prev = lessons[idx - 1];
                      const next = lessons[idx + 1];
                      return (
                        <>
                          {prev ? (
                            <button
                              onClick={() => setActiveLesson(prev)}
                              style={{ background:'#fff', border:'2px solid #FFB3D9', borderRadius:20, color:'#FF6B9D', padding:'0.6rem 1.25rem', fontWeight:800, fontSize:'0.9rem', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}
                            >
                              ← {prev.title}
                            </button>
                          ) : <div />}
                          {next ? (
                            <button
                              onClick={() => setActiveLesson(next)}
                              style={{ background:'linear-gradient(135deg,#FF6B9D,#FF8E53)', border:'none', borderRadius:20, color:'#fff', padding:'0.6rem 1.5rem', fontWeight:900, fontSize:'0.95rem', cursor:'pointer', display:'flex', alignItems:'center', gap:6, boxShadow:'0 4px 16px rgba(255,107,157,0.4)' }}
                            >
                              Tiếp theo 🚀
                            </button>
                          ) : (
                            <div style={{ background:'linear-gradient(135deg,#43e97b,#38f9d7)', border:'none', borderRadius:20, color:'#fff', padding:'0.6rem 1.5rem', fontWeight:900, fontSize:'0.95rem', boxShadow:'0 4px 16px rgba(67,233,123,0.4)' }}>
                              🎉 Học xong rồi! Giỏi lắm!
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'1rem' }}>
              <div style={{ fontSize:'4rem', animation:'miuBob 2s ease-in-out infinite' }}>👈</div>
              <div style={{ fontWeight:900, fontSize:'1.2rem', color:'#FF6B9D' }}>Chọn bài học nào đó đi!</div>
              <p style={{ color:'#aaa', fontWeight:600 }}>Nhấn vào bài học ở bên phải nhé 😊</p>
            </div>
          )}
        </div>

        {/* ===== RIGHT: SYLLABUS ===== */}
        <div style={{ width:'340px', background:'#FFF9FE', borderLeft:'2px solid #FFD6E8', overflowY:'auto', display:'flex', flexDirection:'column' }}>
          {/* Sidebar header */}
          <div style={{
            padding:'1rem 1.25rem',
            background:'linear-gradient(135deg,#FF6B9D,#FF8E53)',
            color:'#fff',
            fontWeight:900, fontSize:'1rem',
            flexShrink:0,
            display:'flex', alignItems:'center', gap:'0.5rem',
          }}>
            📚 Nội dung khoá học
          </div>

          <div style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            {course.chapters?.map((chapter, ci) => {
              const chapterColors = [
                { bg:'#FFE4F0', border:'#FFB3D9', text:'#FF6B9D', dot:'🌸' },
                { bg:'#FFF3E0', border:'#FFCC80', text:'#FF8E53', dot:'🌻' },
                { bg:'#E8F5E9', border:'#A5D6A7', text:'#43A047', dot:'🍀' },
                { bg:'#E3F2FD', border:'#90CAF9', text:'#1E88E5', dot:'🌊' },
                { bg:'#F3E5F5', border:'#CE93D8', text:'#8E24AA', dot:'🌷' },
              ];
              const cc = chapterColors[ci % chapterColors.length];
              return (
                <div key={chapter.id} style={{ background:cc.bg, border:`2px solid ${cc.border}`, borderRadius:16, overflow:'hidden' }}>
                  {/* Chapter title */}
                  <div style={{ padding:'0.75rem 1rem', fontWeight:900, fontSize:'0.9rem', color:cc.text, display:'flex', alignItems:'center', gap:'0.5rem', borderBottom:`1px solid ${cc.border}` }}>
                    <span>{cc.dot}</span> {chapter.title}
                  </div>
                  {/* Lessons */}
                  <div style={{ display:'flex', flexDirection:'column', gap:3, padding:'0.5rem' }}>
                    {chapter.lessons?.map((lesson, idx) => {
                      const isDone = !!progress[lesson.id];
                      const isActive = activeLesson?.id === lesson.id;
                      const typeEmoji = lesson.video_url || lesson.file_type === 'video' ? '🎬' : lesson.file_url ? '📄' : '📖';
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLesson(lesson)}
                          style={{
                            display:'flex', alignItems:'center', gap:'0.6rem',
                            padding:'0.65rem 0.875rem', borderRadius:12,
                            background: isActive ? cc.text : isDone ? 'rgba(67,233,123,0.12)' : '#fff',
                            border: isActive ? 'none' : isDone ? '1.5px solid #43e97b' : `1.5px solid ${cc.border}`,
                            cursor:'pointer', transition:'all 0.15s', textAlign:'left', width:'100%',
                            boxShadow: isActive ? `0 4px 12px ${cc.text}50` : 'none',
                          }}
                        >
                          <span style={{ fontSize:'1rem', flexShrink:0 }}>
                            {isDone ? '✅' : typeEmoji}
                          </span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'0.85rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#fff' : isDone ? '#43A047' : '#444', whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden' }}>
                              {idx + 1}. {lesson.title}
                            </div>
                            {lesson.duration && lesson.duration !== '00:00' && (
                              <div style={{ fontSize:'0.72rem', color: isActive ? 'rgba(255,255,255,0.8)' : '#bbb', fontWeight:600, marginTop:1 }}>
                                ⏱ {lesson.duration}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {chapter.assignments?.map((assignment) => {
                      const isActive = activeLesson?.id === assignment.id && activeLesson?.item_type === 'assignment';
                      return (
                        <button
                          key={`ass_${assignment.id}`}
                          onClick={() => setActiveLesson({...assignment, item_type:'assignment'})}
                          style={{
                            display:'flex', alignItems:'center', gap:'0.6rem',
                            padding:'0.65rem 0.875rem', borderRadius:12,
                            background: isActive ? '#FF8E53' : '#FFF3E0',
                            border: isActive ? 'none' : '1.5px solid #FFCC80',
                            cursor:'pointer', transition:'all 0.15s', textAlign:'left', width:'100%',
                            boxShadow: isActive ? '0 4px 12px rgba(255,142,83,0.4)' : 'none',
                          }}
                        >
                          <span style={{ fontSize:'1rem' }}>📝</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'0.85rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#fff' : '#FF8E53', whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden' }}>
                              Bài tập / Quiz
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Confetti active={showConfetti} />
      <LessonCompleteToast show={showCompleteToast} onClose={() => setShowCompleteToast(false)} />
      <style>{`@keyframes miuBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
    </div>
  );
};

export default CourseLearning;
