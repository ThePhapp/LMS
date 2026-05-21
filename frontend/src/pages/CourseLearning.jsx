import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import {
  FileText, FileVideo, ArrowLeft, Download, Link2, BookOpen, ClipboardList, Check, FileArchive, ChevronRight, ChevronLeft, Sparkles, PanelRightClose, PanelRight
} from 'lucide-react';
import AssignmentViewer from '../components/AssignmentViewer';
import PackageViewer from '../components/PackageViewer';
import { Confetti, FunProgressBar, LessonCompleteToast } from '../components/FunElements';
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

function LessonTypeIcon({ lesson }) {
  if (lesson.video_url || lesson.file_type === 'video') return <FileVideo size={14} color="var(--accent)" />;
  if (lesson.file_type === 'package') return <FileArchive size={14} color="var(--primary)" style={{ fontWeight: 'bold' }} />;
  if (lesson.file_url) return <FileText size={14} color="var(--warning)" />;
  return <BookOpen size={14} color="var(--primary)" />;
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
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 1024);

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
      navigate(`/courses/${id}`);
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

  if (loading) return <div className="loading-wrapper"><div className="spinner" /><p>Đang tải bài học...</p></div>;
  if (!course) return null;

  const lessons = course.lessons || [];
  const completedCount = lessons.filter(l => progress[l.id]).length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const ytId = activeLesson ? getYoutubeId(activeLesson.video_url) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)' }}>
      {/* Top Bar */}
      <div className="learn-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="learn-topbar-back" onClick={() => navigate(`/courses/${id}`)}>
            <ArrowLeft size={18} />
          </button>
          <div className="learn-topbar-title">{course.title}</div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} className="learning-header-actions">
          {user?.role === 'student' && (
            <div style={{ flex: 1, minWidth: '150px' }}>
              <FunProgressBar pct={progressPct} />
            </div>
          )}
          <button 
            className="learn-topbar-back" 
            onClick={() => setShowSidebar(!showSidebar)} 
            title={showSidebar ? 'Ẩn mục lục' : 'Hiện mục lục'}
            style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {showSidebar ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
            <span style={{ display: window.innerWidth > 768 ? 'inline' : 'none' }}>
              {showSidebar ? 'Ẩn' : 'Mục lục'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="learning-layout">
        
        {/* Left: Content Player */}
        <div className="learning-content">
          {activeLesson ? (
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              
              {/* Content Header */}
              <div className="learn-content-header">
                <div>
                  <h2 className="learn-content-title">{activeLesson.title}</h2>
                </div>
                {user?.role === 'student' && activeLesson.item_type !== 'assignment' && (
                  <button
                    className={`learn-mark-btn ${progress[activeLesson.id] ? 'completed' : 'pending'}`}
                    onClick={() => toggleProgress(activeLesson.id, progress[activeLesson.id])}>
                    {progress[activeLesson.id]
                      ? <><Check size={16} /> Đã hoàn thành</>
                      : <><Sparkles size={16} /> Hoàn thành bài học</>}
                  </button>
                )}
              </div>

              {/* Viewers */}
              {activeLesson.item_type === 'assignment' ? (
                <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                  <AssignmentViewer assignment={activeLesson} onSubmissionSuccess={() => fetchFullAssignment(activeLesson.id)} />
                </div>
              ) : (
                <>
                  {ytId && (
                    <div className="video-embed" style={{ boxShadow: 'var(--shadow-lg)', borderRadius: '16px' }}>
                      <iframe src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen style={{ border: 'none' }} />
                    </div>
                  )}

                  {!ytId && activeLesson.file_type === 'video' && activeLesson.file_url && (
                    <div className="video-embed" style={{ boxShadow: 'var(--shadow-lg)', borderRadius: '16px' }}>
                      <video controls style={{ width: '100%', height: '100%' }}>
                        <source src={assetUrl(activeLesson.file_url)} />
                      </video>
                    </div>
                  )}

                  {activeLesson.video_url && !ytId && (
                    <div className="doc-preview" style={{ marginBottom: '1.5rem', borderRadius: '12px' }}>
                      <div className="doc-icon" style={{ background: '#CFFAFE' }}>🎬</div>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Liên kết Video ngoài</div>
                        <a href={activeLesson.video_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><Link2 size={13} /> Mở Video</a>
                      </div>
                    </div>
                  )}

                  {activeLesson.file_url && activeLesson.file_type !== 'video' && (
                    <>
                      {activeLesson.file_type === 'package' && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <PackageViewer
                            lessonId={activeLesson.id}
                            fileName={activeLesson.file_name}
                            packageUrl={activeLesson.file_url}
                            inline={true}
                          />
                        </div>
                      )}

                      {activeLesson.file_type === 'pdf' ? (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                              📄 {activeLesson.file_name || 'Tài liệu PDF'}
                            </div>
                            <a href={assetUrl(activeLesson.file_url)} download className="btn btn-secondary btn-sm" style={{ borderRadius: '9999px' }}>
                              <Download size={13} /> Tải xuống
                            </a>
                          </div>
                          <div style={{ 
                            width: '100%', 
                            height: '600px', 
                            border: '1px solid var(--border)', 
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-lg)'
                          }}>
                            <iframe 
                              src={`${assetUrl(activeLesson.file_url)}#view=FitH`}
                              style={{ width: '100%', height: '100%', border: 'none' }}
                              title="PDF Viewer"
                            />
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
                          <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                                {icon} {activeLesson.file_name || label}
                              </div>
                              <a href={fullUrl} download className="btn btn-secondary btn-sm" style={{ borderRadius: '9999px' }}>
                                <Download size={13} /> Tải xuống
                              </a>
                            </div>
                            {isLocal ? (
                              <div className="doc-preview" style={{ background: '#FEF3C7', border: '1px solid #F59E0B', padding: '1.25rem', borderRadius: '12px' }}>
                                <div className="doc-icon" style={{ background: '#FDE68A', fontSize: '1.5rem' }}>{icon}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Xem trước không khả dụng trên localhost</div>
                                  <div style={{ fontSize: '0.85rem', color: '#92400E', marginBottom: 8 }}>
                                    Cần triển khai lên server để xem trực tuyến. Hãy tải xuống để xem trên máy.
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{
                                width: '100%',
                                height: '700px',
                                border: '1px solid var(--border)',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: 'var(--shadow-lg)',
                                background: '#f1f5f9'
                              }}>
                                <iframe
                                  src={officeViewerUrl}
                                  style={{ width: '100%', height: '100%', border: 'none' }}
                                  title={label}
                                  allowFullScreen
                                />
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        <div className="doc-preview" style={{ borderRadius: '12px' }}>
                          <div className="doc-icon" style={{ background: '#EDE9FE' }}>📝</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{activeLesson.file_name || 'Tài liệu'}</div>
                            <a href={assetUrl(activeLesson.file_url)} download className="btn btn-secondary btn-sm" style={{ borderRadius: '9999px' }}>
                              <Download size={13} /> Tải xuống
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Context Tabs */}
                  <div className="tabs" style={{ marginTop: '2rem', borderBottom: '2px solid var(--border)' }}>
                    <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Tổng quan</button>
                    {user?.role === 'student' && <button className={`tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>Ghi chú</button>}
                    <button className={`tab ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>Hỏi đáp</button>
                    <button className={`tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Sparkles size={14} /> Học cùng AI
                    </button>
                  </div>

                  <div className="tab-content" style={{ marginTop: '1.5rem', minHeight: '300px' }}>
                    {activeTab === 'overview' && (
                      <div style={{ fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                        {activeLesson.content || <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Chưa có mô tả cho bài học này.</div>}
                      </div>
                    )}
                    {activeTab === 'notes' && user?.role === 'student' && (
                      <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Ghi chú riêng tư cho bài học này.</p>
                          <button className="btn btn-primary btn-sm" onClick={saveNotes} style={{ borderRadius: '9999px' }}>Lưu ghi chú</button>
                        </div>
                        <textarea className="form-textarea" rows="8" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Nhập ghi chú của bạn..." style={{ borderRadius: '12px' }} />
                      </div>
                    )}
                    {activeTab === 'ai' && (
                      <LessonAiChat lesson={activeLesson} course={course} />
                    )}
                    {activeTab === 'comments' && (
                      <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
                        {/* Write comment */}
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <form onSubmit={submitComment} style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="form-input"
                              style={{ flex: 1, borderRadius: '9999px', padding: '0.55rem 1.25rem' }}
                              value={newComment}
                              onChange={e => setNewComment(e.target.value)}
                              placeholder="Viết bình luận hoặc đặt câu hỏi..."
                            />
                            {newComment.trim() && (
                              <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: '9999px', whiteSpace: 'nowrap' }}>Gửi</button>
                            )}
                          </form>
                        </div>
                        {/* Comments list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {comments.filter(c => !c.parent_id).map(c => {
                            const replies = comments.filter(r => r.parent_id === c.id);
                            const isReplying = replyingTo === c.id;
                            return (
                              <div key={c.id}>
                                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                                    {c.user_name[0].toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ background: 'var(--surface-2)', borderRadius: '14px', padding: '0.7rem 1rem', display: 'inline-block', maxWidth: '100%', border: '1px solid var(--border)' }}>
                                      <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>{c.user_name}</div>
                                      <div style={{ fontSize: '0.92rem', color: 'var(--text)', lineHeight: 1.5 }}>{c.content}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', paddingLeft: '0.5rem', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
                                      <button
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: isReplying ? 'var(--primary)' : 'var(--text-muted)', padding: 0 }}
                                        onClick={() => { setReplyingTo(isReplying ? null : c.id); setReplyContent(''); }}
                                      >Phản hồi</button>
                                    </div>
                                    {/* Replies */}
                                    {replies.length > 0 && (
                                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border)' }}>
                                        {replies.map(r => (
                                          <div key={r.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #0ea5e9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                                              {r.user_name[0].toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <div style={{ background: 'var(--surface-2)', borderRadius: '12px', padding: '0.5rem 0.875rem', display: 'inline-block', maxWidth: '100%', border: '1px solid var(--border)' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.83rem', marginBottom: 2 }}>{r.user_name}</div>
                                                <div style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>{r.content}</div>
                                              </div>
                                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', paddingLeft: '0.5rem' }}>{timeAgo(r.created_at)}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {/* Reply input */}
                                    {isReplying && (
                                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                                          {user?.name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <form onSubmit={(e) => submitReply(e, c.id)} style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                          <input
                                            type="text"
                                            className="form-input"
                                            style={{ flex: 1, borderRadius: '9999px', padding: '0.4rem 1rem', fontSize: '0.88rem' }}
                                            value={replyContent}
                                            onChange={e => setReplyContent(e.target.value)}
                                            placeholder={`Phản hồi ${c.user_name}...`}
                                            autoFocus
                                          />
                                          {replyContent.trim() && (
                                            <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: '9999px', whiteSpace: 'nowrap' }}>Gửi</button>
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
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                              <BookOpen size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                              <p>Chưa có thảo luận nào. Hãy đặt câu hỏi!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nav Buttons */}
                  <div className="learn-nav">
                    {(() => {
                      const idx = lessons.findIndex(l => l.id === activeLesson.id);
                      const prev = lessons[idx - 1];
                      const next = lessons[idx + 1];
                      return (
                        <>
                          {prev 
                            ? <button className="learn-nav-btn prev" onClick={() => setActiveLesson(prev)}>
                                <ChevronLeft size={16} /> {prev.title}
                              </button> 
                            : <div />
                          }
                          {next 
                            ? <button className="learn-nav-btn next" onClick={() => setActiveLesson(next)}>
                                Tiếp tục <ChevronRight size={16} />
                              </button> 
                            : <div style={{ fontSize: '1rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Check size={18} /> Bạn đã hoàn thành!
                              </div>
                          }
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📖</div>
              <h3>Chọn bài học</h3>
              <p>Chọn bài học từ mục lục bên phải để bắt đầu.</p>
            </div>
          )}
        </div>

        {/* Right: Sidebar Syllabus */}
        {showSidebar && (
          <div className="learning-sidebar" style={{ width: '360px' }}>
            <div style={{ 
              padding: '1.15rem 1.5rem', 
              borderBottom: '1px solid var(--border)', 
              fontWeight: 800, 
              fontSize: '1rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              background: 'var(--surface)',
              flexShrink: 0
            }}>
              <BookOpen size={18} color="var(--primary)" />
              Nội dung khoá học
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {course.chapters?.map((chapter) => (
                <div key={chapter.id}>
                  {/* Chapter title */}
                  <div style={{ 
                    fontWeight: 700, 
                    padding: '0.75rem 1.5rem 0.5rem', 
                    fontSize: '0.78rem', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px', 
                    color: 'var(--text-muted)', 
                    background: 'var(--surface-2)', 
                    borderBottom: '1px solid var(--border)',
                    borderTop: '1px solid var(--border)'
                  }}>
                    {chapter.title}
                  </div>

                  {/* Lesson items */}
                  {chapter.lessons?.map((lesson, idx) => {
                    const isDone = !!progress[lesson.id];
                    const isActive = activeLesson?.id === lesson.id;
                    return (
                      <div key={lesson.id}
                        onClick={() => setActiveLesson(lesson)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          padding: '0.9rem 1.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          borderBottom: '1px solid var(--border)',
                          borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                          background: isActive ? 'var(--primary-light)' : 'transparent',
                          opacity: isDone && !isActive ? 0.65 : 1
                        }}>
                        
                        {/* Check circle */}
                        <div style={{
                          width: '24px', height: '24px',
                          borderRadius: '50%',
                          border: isDone ? 'none' : isActive ? '2px solid var(--primary)' : '2px solid var(--border-2)',
                          background: isDone ? 'var(--success)' : isActive ? 'var(--primary-light)' : 'var(--surface)',
                          color: isDone ? '#fff' : isActive ? 'var(--primary)' : 'var(--text-light)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, fontSize: '0.7rem', fontWeight: 700
                        }}>
                          {isDone ? <Check size={12} /> : (idx + 1)}
                        </div>

                        {/* Lesson info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: '0.88rem', 
                            fontWeight: isActive ? 700 : 500, 
                            color: isActive ? 'var(--primary-dark)' : 'var(--text)', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis' 
                          }}>
                            {lesson.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '3px' }}>
                            <LessonTypeIcon lesson={lesson} /> {lesson.duration || '00:00'}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Assignment items */}
                  {chapter.assignments?.map((assignment) => {
                    const isActive = activeLesson?.id === assignment.id && activeLesson?.item_type === 'assignment';
                    return (
                      <div key={`ass_${assignment.id}`}
                        onClick={() => setActiveLesson({...assignment, item_type: 'assignment'})}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          padding: '0.9rem 1.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          borderBottom: '1px solid var(--border)',
                          borderLeft: isActive ? '3px solid var(--warning)' : '3px solid transparent',
                          background: isActive ? '#FEF9C3' : 'transparent',
                        }}>
                        
                        <div style={{
                          width: '24px', height: '24px',
                          borderRadius: '50%',
                          border: `2px solid var(--warning)`,
                          background: isActive ? '#FEF3C7' : 'var(--surface)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <ClipboardList size={12} color="var(--warning)" />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontSize: '0.88rem', 
                            fontWeight: isActive ? 700 : 500, 
                            color: 'var(--text)', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis' 
                          }}>
                            {assignment.title || 'Bài tập / Quiz'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '3px' }}>
                            <ClipboardList size={12} color="var(--warning)" /> Bài tập
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Confetti active={showConfetti} />
      <LessonCompleteToast show={showCompleteToast} onClose={() => setShowCompleteToast(false)} />
    </div>
  );
};

export default CourseLearning;
