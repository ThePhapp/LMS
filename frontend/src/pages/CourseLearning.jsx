import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import {
  FileText, FileVideo, Circle, ArrowLeft, Download, Link2, BookOpen, ClipboardList, Check, FileArchive
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

  if (loading) return <div className="loading-wrapper"><div className="spinner" /><p>Đang tải bài học...</p></div>;
  if (!course) return null;

  const lessons = course.lessons || [];
  const completedCount = lessons.filter(l => progress[l.id]).length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const ytId = activeLesson ? getYoutubeId(activeLesson.video_url) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)' }}>
      {/* Top Navbar Context */}
      <div style={{ background: '#1e293b', color: '#fff', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" style={{ color: '#94a3b8', padding: '0.25rem' }} onClick={() => navigate(`/courses/${id}`)}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{course.title}</div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} className="learning-header-actions">
          {user?.role === 'student' && (
            <div style={{ flex: 1, minWidth: '150px' }}>
              <FunProgressBar pct={progressPct} />
            </div>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowSidebar(!showSidebar)} style={{ whiteSpace: 'nowrap' }}>
            {showSidebar ? 'Ẩn mục lục' : 'Hiện mục lục'}
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="learning-layout">
        
        {/* Left: Content Player (70%) */}
        <div className="learning-content">
          {activeLesson ? (
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              
              {/* Content Header */}
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{activeLesson.title}</h2>
                </div>
                {user?.role === 'student' && activeLesson.item_type !== 'assignment' && (
                    <button
                      className={`btn ${progress[activeLesson.id] ? 'btn-success' : 'btn-secondary'}`}
                      style={progress[activeLesson.id] ? {} : { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', border: 'none' }}
                      onClick={() => toggleProgress(activeLesson.id, progress[activeLesson.id])}>
                      {progress[activeLesson.id]
                          ? <>✅ Đã hoàn thành!</>
                          : <>🎯 Đánh dấu hoàn thành</>}
                    </button>
                )}
              </div>

              {/* Viewers */}
              {activeLesson.item_type === 'assignment' ? (
                <div className="card" style={{ padding: '1.5rem' }}>
                  <AssignmentViewer assignment={activeLesson} onSubmissionSuccess={() => fetchFullAssignment(activeLesson.id)} />
                </div>
              ) : (
                <>
                  {ytId && (
                    <div className="video-embed" style={{ boxShadow: 'var(--shadow-lg)' }}>
                      <iframe src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen style={{ border: 'none' }} />
                    </div>
                  )}

                  {!ytId && activeLesson.file_type === 'video' && activeLesson.file_url && (
                    <div className="video-embed" style={{ boxShadow: 'var(--shadow-lg)' }}>
                      <video controls style={{ width: '100%', height: '100%' }}>
                        <source src={assetUrl(activeLesson.file_url)} />
                      </video>
                    </div>
                  )}

                  {activeLesson.video_url && !ytId && (
                    <div className="doc-preview" style={{ marginBottom: '1.5rem' }}>
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
                            <a href={assetUrl(activeLesson.file_url)} download className="btn btn-secondary btn-sm">
                              <Download size={13} /> Tải xuống
                            </a>
                          </div>
                          <div style={{ 
                            width: '100%', 
                            height: '600px', 
                            border: '1px solid var(--border)', 
                            borderRadius: 'var(--radius)',
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
                              <a href={fullUrl} download className="btn btn-secondary btn-sm">
                                <Download size={13} /> Tải xuống
                              </a>
                            </div>
                            {isLocal ? (
                              <div className="doc-preview" style={{ background: '#FEF3C7', border: '1px solid #F59E0B', padding: '1.25rem' }}>
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
                                borderRadius: 'var(--radius)',
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
                        <div className="doc-preview">
                          <div className="doc-icon" style={{ background: '#EDE9FE' }}>📝</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{activeLesson.file_name || 'Tài liệu'}</div>
                            <a href={assetUrl(activeLesson.file_url)} download className="btn btn-secondary btn-sm">
                              <Download size={13} /> Tải xuống
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Context Tabs */}
                  <div className="tabs" style={{ marginTop: '2rem', borderBottom: '1px solid var(--border)' }}>
                    <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Tổng quan</button>
                    {user?.role === 'student' && <button className={`tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>Ghi chú</button>}
                    <button className={`tab ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>Hỏi đáp (Q&A)</button>
                    <button className={`tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>Học Cùng AI</button>
                  </div>

                  <div className="tab-content" style={{ marginTop: '1.5rem', minHeight: '300px' }}>
                    {activeTab === 'overview' && (
                      <div style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                        {activeLesson.content || <div style={{ color: 'var(--text-muted)' }}>Chưa có mô tả cho bài học này.</div>}
                      </div>
                    )}
                    {activeTab === 'notes' && user?.role === 'student' && (
                      <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Ghi chú riêng tư cho bài học này.</p>
                          <button className="btn btn-primary btn-sm" onClick={saveNotes}>Lưu ghi chú</button>
                        </div>
                        <textarea className="form-textarea" rows="8" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Nhập ghi chú của bạn..." />
                      </div>
                    )}
                    {activeTab === 'ai' && (
                      <LessonAiChat lesson={activeLesson} course={course} />
                    )}
                    {activeTab === 'comments' && (
                      <div className="card" style={{ padding: '1.5rem' }}>
                        {/* Write comment */}
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <form onSubmit={submitComment} style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="form-input"
                              style={{ flex: 1, borderRadius: '20px', padding: '0.5rem 1rem' }}
                              value={newComment}
                              onChange={e => setNewComment(e.target.value)}
                              placeholder="Viết bình luận..."
                            />
                            {newComment.trim() && (
                              <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: '20px', whiteSpace: 'nowrap' }}>Gửi</button>
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
                                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                                    {c.user_name[0].toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '0.6rem 0.875rem', display: 'inline-block', maxWidth: '100%' }}>
                                      <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 2 }}>{c.user_name}</div>
                                      <div style={{ fontSize: '0.95rem', color: 'var(--text)' }}>{c.content}</div>
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
                                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {replies.map(r => (
                                          <div key={r.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                                              {r.user_name[0].toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '0.5rem 0.875rem', display: 'inline-block', maxWidth: '100%' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.83rem', marginBottom: 2 }}>{r.user_name}</div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{r.content}</div>
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
                                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                                          {user?.name?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <form onSubmit={(e) => submitReply(e, c.id)} style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                          <input
                                            type="text"
                                            className="form-input"
                                            style={{ flex: 1, borderRadius: '20px', padding: '0.4rem 0.875rem', fontSize: '0.9rem' }}
                                            value={replyContent}
                                            onChange={e => setReplyContent(e.target.value)}
                                            placeholder={`Phản hồi ${c.user_name}...`}
                                            autoFocus
                                          />
                                          {replyContent.trim() && (
                                            <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: '20px', whiteSpace: 'nowrap' }}>Gửi</button>
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
                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>Chưa có thảo luận nào. Hãy đặt câu hỏi!</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nav Buttons below video */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    {(() => {
                      const idx = lessons.findIndex(l => l.id === activeLesson.id);
                      const prev = lessons[idx - 1];
                      const next = lessons[idx + 1];
                      return (
                        <>
                          {prev ? <button className="btn btn-secondary" onClick={() => setActiveLesson(prev)}>← {prev.title}</button> : <div />}
                          {next ? <button className="btn btn-primary" onClick={() => setActiveLesson(next)}>Hiểu rồi, Tiếp tục →</button> : <div style={{ fontSize: '1rem', color: 'var(--success)', fontWeight: 600 }}>🎉 Bạn đã học xong!</div>}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">👈</div>
              <h3>Chọn bài học</h3>
              <p>Chọn bài học từ danh sách bên phải.</p>
            </div>
          )}
        </div>

        {/* Right: Sticky Syllabus (30%) */}
        {showSidebar && (
          <div className="learning-sidebar">
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 800, fontSize: '1.1rem' }}>
            Nội dung khoá học
          </div>
          <div className="lesson-list" style={{ padding: '1rem' }}>
            {course.chapters?.map((chapter) => (
              <div key={chapter.id} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 800, padding: '0 0.5rem', color: 'var(--text)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                  {chapter.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {chapter.lessons?.map((lesson, idx) => {
                    const isDone = !!progress[lesson.id];
                    const isActive = activeLesson?.id === lesson.id;
                    return (
                      <div key={lesson.id}
                        className={`lesson-item ${isActive ? 'active' : ''}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'var(--transition)',
                          background: isActive ? 'var(--primary-light)' : 'transparent',
                          border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                          opacity: isDone && !isActive ? 0.7 : 1
                        }}
                        onClick={() => setActiveLesson(lesson)}>
                        
                        <div style={{ color: isDone ? 'var(--success)' : 'var(--text-light)', flexShrink: 0, marginTop: '2px' }}>
                          {isDone ? <Check size={18} /> : <Circle size={18} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--primary-dark)' : 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {idx + 1}. {lesson.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            <LessonTypeIcon lesson={lesson} /> {lesson.duration || '00:00'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {chapter.assignments?.map((assignment) => {
                    const isActive = activeLesson?.id === assignment.id && activeLesson?.item_type === 'assignment';
                    return (
                      <div key={`ass_${assignment.id}`}
                        className={`lesson-item ${isActive ? 'active' : ''}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'var(--transition)',
                          background: isActive ? 'var(--warning-light)' : 'transparent',
                          border: isActive ? '1px solid var(--warning)' : '1px solid transparent'
                        }}
                        onClick={() => setActiveLesson({...assignment, item_type: 'assignment'})}>
                        
                        <div style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }}>
                          <ClipboardList size={18} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: isActive ? 700 : 500, color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {assignment.title || 'Bài tập / Quiz'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
