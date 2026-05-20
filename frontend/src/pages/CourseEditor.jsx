import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { FileEdit, List, DollarSign, CheckCircle, ArrowLeft, Upload, Plus, Trash2, X, Video, File, FileText, ClipboardList, Calendar, Copy, ChevronLeft, ChevronRight, Eye, Save, CheckCircle2, AlertCircle, GripVertical, ChevronDown, ChevronUp, Pencil, Check } from 'lucide-react';

const CATEGORIES = ['All', 'Math', 'Vietnamese', 'English', 'Ethics', 'Nature', 'Music', 'Arts', 'PE'];
const CATEGORY_LABELS = { All: 'Tất cả', Math: 'Toán', Vietnamese: 'Tiếng Việt', English: 'Tiếng Anh', Ethics: 'Đạo đức', Nature: 'Tự nhiên và Xã hội', Music: 'Âm nhạc', Arts: 'Mỹ thuật', PE: 'Thể dục' };
const LEVELS = ['Semester1', 'Semester2'];
const LEVEL_LABELS = { Semester1: 'Học kỳ 1', Semester2: 'Học kỳ 2' };

const CourseEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isEdit = !!id;

  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [course, setCourse] = useState({
    title: '', description: '', category: 'Math', price: 0, level: 'Semester1', thumbnail_url: ''
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  
  // Curriculum State
  const [chapters, setChapters] = useState([]);
  
  // Lesson Modal State
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [currentChapterId, setCurrentChapterId] = useState(null);
  const [lessonForm, setLessonForm] = useState({
    title: '', content: '', video_url: '', lesson_order: 0, duration: ''
  });
  const [lessonFile, setLessonFile] = useState(null);
  const [lessonUploadProgress, setLessonUploadProgress] = useState(0);

  // Assignment Modal State
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '', description: '', type: 'essay', total_points: 100, due_date: '',
    time_limit: '', max_attempts: 1, allow_resubmit: false, shuffle_questions: false, shuffle_options: false, status: 'published'
  });
  const [assignmentTab, setAssignmentTab] = useState('basic');

  // Quiz Builder State
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [quizBuilderAssignment, setQuizBuilderAssignment] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [quizSaving, setQuizSaving] = useState(false);
  const [quizPreview, setQuizPreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [previewSubmitted, setPreviewSubmitted] = useState(false);

  // Toast & Chapter UI State
  const [toast, setToast] = useState(null);
  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [renamingChapter, setRenamingChapter] = useState(null);
  const [renamingTitle, setRenamingTitle] = useState('');
  const [collapsedChapters, setCollapsedChapters] = useState(new Set());

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (user && user.role !== 'lecturer' && user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    if (isEdit) fetchCourse();
  }, [id, user]);

  const fetchCourse = async () => {
    try {
      const res = await api.get(`/courses/${id}`);
      const data = res.data;
      setCourse({
        title: data.title, description: data.description, category: data.category,
        price: data.price || 0, level: data.level || 'Beginner', thumbnail_url: data.thumbnail_url
      });
      setChapters(data.chapters || []);
    } catch {
      navigate('/instructor/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBasic = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title', course.title);
      fd.append('description', course.description);
      fd.append('category', course.category);
      fd.append('price', course.price);
      fd.append('level', course.level);
      if (thumbnailFile) fd.append('thumbnail', thumbnailFile);

      if (isEdit) {
        const res = await api.put(`/courses/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setCourse({ ...course, thumbnail_url: res.data.thumbnail_url });
        setThumbnailFile(null);
        setThumbnailPreview(null);
        showToast('Đã lưu thông tin khóa học');
      } else {
        const res = await api.post('/courses', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        navigate(`/instructor/course/${res.data.id}/edit`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi lưu thông tin');
    } finally {
      setSaving(false);
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  // Curriculum Handlers (Simplified representations)
  const addChapter = async () => {
    if (!newChapterTitle.trim()) return;
    try {
      if (isEdit) {
        await api.post('/chapters', { course_id: id, title: newChapterTitle.trim(), chapter_order: chapters.length + 1 });
        fetchCourse();
        setNewChapterTitle('');
        setAddingChapter(false);
        showToast('Đã thêm chương mới');
      }
    } catch { showToast('Lỗi tạo chương. Vui lòng lưu thông tin cơ bản trước.', 'error'); }
  };

  const renameChapter = async (chapId) => {
    if (!renamingTitle.trim()) { setRenamingChapter(null); return; }
    try {
      await api.put(`/chapters/${chapId}`, { title: renamingTitle.trim() });
      fetchCourse();
      setRenamingChapter(null);
      showToast('Đã đổi tên chương');
    } catch { showToast('Lỗi đổi tên chương', 'error'); }
  };

  const toggleChapter = (chapId) => {
    setCollapsedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapId)) next.delete(chapId); else next.add(chapId);
      return next;
    });
  };

  const deleteChapter = async (chapId) => {
    if (!window.confirm('Xóa chương này?')) return;
    try {
      await api.delete(`/chapters/${chapId}`);
      fetchCourse();
    } catch {}
  };

  // Lesson Handlers
  const openLessonModal = (chapterId, lesson = null) => {
    setCurrentChapterId(chapterId);
    setEditingLesson(lesson);
    if (lesson) {
      setLessonForm({
        title: lesson.title,
        content: lesson.content || '',
        video_url: lesson.video_url || '',
        lesson_order: lesson.lesson_order || 0,
        duration: lesson.duration || ''
      });
    } else {
      setLessonForm({ title: '', content: '', video_url: '', lesson_order: 0, duration: '' });
    }
    setLessonFile(null);
    setShowLessonModal(true);
  };

  const closeLessonModal = () => {
    setShowLessonModal(false);
    setEditingLesson(null);
    setCurrentChapterId(null);
    setLessonForm({ title: '', content: '', video_url: '', lesson_order: 0, duration: '' });
    setLessonFile(null);
    setLessonUploadProgress(0);
  };

  const saveLessonForm = async (e) => {
    e.preventDefault();
    
    if (lessonFile) {
      if (lessonFile.size > 500 * 1024 * 1024) {
        showToast('File quá lớn. Giới hạn tối đa là 500MB.', 'error');
        return;
      }
      if (lessonFile.name.toLowerCase().endsWith('.zip')) {
        // Option to add specific zip validation on frontend if needed, but size is most important
      }
    }

    setSaving(true);
    setLessonUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append('course_id', id);
      fd.append('chapter_id', currentChapterId);
      fd.append('title', lessonForm.title);
      fd.append('content', lessonForm.content);
      fd.append('video_url', lessonForm.video_url);
      fd.append('lesson_order', lessonForm.lesson_order);
      fd.append('duration', lessonForm.duration);
      if (lessonFile) fd.append('file', lessonFile);

      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setLessonUploadProgress(percentCompleted);
          }
        }
      };

      if (editingLesson) {
        await api.put(`/lessons/${editingLesson.id}`, fd, config);
      } else {
        await api.post('/lessons', fd, config);
      }
      
      closeLessonModal();
      fetchCourse();
      showToast('Đã lưu bài học thành công');
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi lưu bài học', 'error');
    } finally {
      setSaving(false);
      setLessonUploadProgress(0);
    }
  };

  const deleteLesson = async (lessonId) => {
    if (!window.confirm('Xóa bài học này?')) return;
    try {
      await api.delete(`/lessons/${lessonId}`);
      fetchCourse();
    } catch {}
  };

  // Assignment Handlers
  const openAssignmentModal = (chapterId, assignment = null) => {
    setCurrentChapterId(chapterId);
    setEditingAssignment(assignment);
    setAssignmentTab('basic');
    if (assignment) {
      setAssignmentForm({
        title: assignment.title,
        description: assignment.description || '',
        type: assignment.type || 'essay',
        total_points: assignment.total_points || 100,
        due_date: assignment.due_date ? assignment.due_date.substring(0, 16) : '',
        time_limit: assignment.time_limit || '',
        max_attempts: assignment.max_attempts !== undefined ? assignment.max_attempts : 1,
        allow_resubmit: !!assignment.allow_resubmit,
        shuffle_questions: !!assignment.shuffle_questions,
        shuffle_options: !!assignment.shuffle_options,
        status: assignment.status || 'published'
      });
    } else {
      setAssignmentForm({ title: '', description: '', type: 'essay', total_points: 100, due_date: '',
        time_limit: '', max_attempts: 1, allow_resubmit: false, shuffle_questions: false, shuffle_options: false, status: 'published'
      });
    }
    setShowAssignmentModal(true);
  };

  const closeAssignmentModal = () => {
    setShowAssignmentModal(false);
    setEditingAssignment(null);
    setCurrentChapterId(null);
    setAssignmentForm({ title: '', description: '', type: 'essay', total_points: 100, due_date: '' });
  };

  const saveAssignmentForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: assignmentForm.title,
        description: assignmentForm.description,
        chapter_id: currentChapterId,
        type: assignmentForm.type,
        total_points: assignmentForm.total_points,
        due_date: assignmentForm.due_date || null,
        time_limit: assignmentForm.time_limit ? parseInt(assignmentForm.time_limit) : null,
        max_attempts: parseInt(assignmentForm.max_attempts) || 1,
        allow_resubmit: !!assignmentForm.allow_resubmit,
        shuffle_questions: !!assignmentForm.shuffle_questions,
        shuffle_options: !!assignmentForm.shuffle_options,
        status: assignmentForm.status || 'published'
      };

      if (editingAssignment) {
        // Note: Backend might not have PUT for assignments, we'll use POST/DELETE pattern
        await api.delete(`/assignments/${editingAssignment.id}`);
        await api.post(`/assignments/course/${id}`, payload);
      } else {
        await api.post(`/assignments/course/${id}`, payload);
      }
      
      closeAssignmentModal();
      fetchCourse();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi lưu bài tập', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (assignmentId) => {
    if (!window.confirm('Xóa bài tập này?')) return;
    try {
      await api.delete(`/assignments/${assignmentId}`);
      fetchCourse();
    } catch {}
  };

  // Quiz Builder Handlers
  const openQuizBuilder = async (assignment) => {
    try {
      const res = await api.get(`/assignments/${assignment.id}`);
      setQuizBuilderAssignment(res.data);
      const existingQs = (res.data.questions || []).map((q, i) => ({
        id: q.id,
        question_text: q.question_text,
        options: q.options || ['', ''],
        correct_option: q.correct_option,
        points: q.points || 10
      }));
      if (existingQs.length === 0) {
        existingQs.push({ question_text: '', options: ['', '', '', ''], correct_option: 0, points: 10 });
      }
      setQuizQuestions(existingQs);
      setActiveQuestionIdx(0);
      setQuizPreview(false);
      setPreviewAnswers({});
      setPreviewSubmitted(false);
      setShowQuizBuilder(true);
    } catch (err) {
      showToast('Không thể tải quiz', 'error');
    }
  };

  const closeQuizBuilder = () => {
    setShowQuizBuilder(false);
    setQuizBuilderAssignment(null);
    setQuizQuestions([]);
    setActiveQuestionIdx(0);
    setQuizPreview(false);
  };

  const addQuizQuestion = () => {
    const newQ = { question_text: '', options: ['', '', '', ''], correct_option: 0, points: 10 };
    setQuizQuestions([...quizQuestions, newQ]);
    setActiveQuestionIdx(quizQuestions.length);
  };

  const duplicateQuestion = (idx) => {
    const q = quizQuestions[idx];
    const copy = { ...q, id: undefined, question_text: q.question_text + ' (copy)', options: [...q.options] };
    const updated = [...quizQuestions];
    updated.splice(idx + 1, 0, copy);
    setQuizQuestions(updated);
    setActiveQuestionIdx(idx + 1);
  };

  const removeQuizQuestion = (idx) => {
    if (quizQuestions.length <= 1) return alert('Quiz phải có ít nhất 1 câu hỏi');
    const updated = quizQuestions.filter((_, i) => i !== idx);
    setQuizQuestions(updated);
    if (activeQuestionIdx >= updated.length) setActiveQuestionIdx(updated.length - 1);
  };

  const updateQuizQuestion = (idx, field, value) => {
    const updated = [...quizQuestions];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuizQuestions(updated);
  };

  const updateOption = (qIdx, optIdx, value) => {
    const updated = [...quizQuestions];
    const opts = [...updated[qIdx].options];
    opts[optIdx] = value;
    updated[qIdx] = { ...updated[qIdx], options: opts };
    setQuizQuestions(updated);
  };

  const addOption = (qIdx) => {
    const updated = [...quizQuestions];
    if (updated[qIdx].options.length >= 6) return;
    updated[qIdx] = { ...updated[qIdx], options: [...updated[qIdx].options, ''] };
    setQuizQuestions(updated);
  };

  const removeOption = (qIdx, optIdx) => {
    const updated = [...quizQuestions];
    if (updated[qIdx].options.length <= 2) return;
    const opts = updated[qIdx].options.filter((_, i) => i !== optIdx);
    let correct = updated[qIdx].correct_option;
    if (correct >= opts.length) correct = 0;
    else if (correct > optIdx) correct--;
    updated[qIdx] = { ...updated[qIdx], options: opts, correct_option: correct };
    setQuizQuestions(updated);
  };

  const saveQuizQuestions = async () => {
    // Validate
    for (let i = 0; i < quizQuestions.length; i++) {
      const q = quizQuestions[i];
      if (!q.question_text.trim()) { showToast(`Câu ${i + 1}: Chưa nhập nội dung câu hỏi`, 'error'); setActiveQuestionIdx(i); return; }
      const filledOpts = q.options.filter(o => o.trim());
      if (filledOpts.length < 2) { showToast(`Câu ${i + 1}: Cần ít nhất 2 đáp án`, 'error'); setActiveQuestionIdx(i); return; }
      if (q.correct_option >= filledOpts.length) { showToast(`Câu ${i + 1}: Đáp án đúng không hợp lệ`, 'error'); setActiveQuestionIdx(i); return; }
    }

    setQuizSaving(true);
    try {
      const cleaned = quizQuestions.map(q => ({
        question_text: q.question_text,
        options: q.options.filter(o => o.trim()),
        correct_option: q.correct_option,
        points: q.points || 10
      }));
      await api.put(`/assignments/${quizBuilderAssignment.id}/questions/bulk`, { questions: cleaned });
      showToast(`Đã lưu ${cleaned.length} câu hỏi thành công!`);
      fetchCourse();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi lưu câu hỏi', 'error');
    } finally {
      setQuizSaving(false);
    }
  };

  if (loading) return <div className="loading-wrapper"><div className="spinner" /></div>;

  return (
    <div className="main-content">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }} onClick={() => navigate('/instructor/dashboard')}>
        <ArrowLeft size={16} /> Quay lại Dashboard
      </button>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Sidebar Menu */}
        <div className="card" style={{ width: '240px', flexShrink: 0, padding: '1rem' }}>
          {isEdit && (
            <div style={{ padding: '0.75rem 1rem', marginBottom: '0.75rem', background: 'var(--surface-2)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Thống kê nhanh</div>
              <div>{chapters.length} chương · {chapters.reduce((s, ch) => s + (ch.lessons?.length || 0), 0)} bài học</div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <button className={`btn ${activeTab === 'basic' ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('basic')}>
              <FileEdit size={16} /> Thông tin cơ bản
            </button>
            <button className={`btn ${activeTab === 'curriculum' ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('curriculum')} disabled={!isEdit}>
              <List size={16} /> Chương trình học
              {isEdit && chapters.length > 0 && (
                <span style={{ marginLeft: 'auto', background: activeTab === 'curriculum' ? 'rgba(255,255,255,0.3)' : 'var(--border)', borderRadius: '999px', padding: '0.1rem 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}>{chapters.length}</span>
              )}
            </button>
            <button className={`btn ${activeTab === 'publish' ? 'btn-success' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('publish')} disabled={!isEdit}>
              <CheckCircle size={16} /> Xem trước
            </button>
            <button className={`btn ${activeTab === 'pricing' ? 'btn-primary' : 'btn-ghost'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('pricing')}>
              <DollarSign size={16} /> Mức độ
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          
          <form className="card" style={{ padding: '2rem' }} onSubmit={handleSaveBasic}>
            
            {activeTab === 'basic' && (
              <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Thông tin cơ bản</h2>
                <div className="form-group">
                  <label className="form-label">Tiêu đề khóa học</label>
                  <input type="text" className="form-input" required value={course.title} onChange={e => setCourse({...course, title: e.target.value})} placeholder="VD: Lập trình ReactJS từ A-Z" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả chi tiết</label>
                  <textarea className="form-textarea" required rows="6" value={course.description} onChange={e => setCourse({...course, description: e.target.value})} placeholder="Mô tả những gì học viên sẽ đạt được..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Chủ đề</label>
                  <select className="form-select" value={course.category} onChange={e => setCourse({...course, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hình ảnh Thumbnail</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    {(thumbnailPreview || (course.thumbnail_url && !thumbnailFile)) && (
                      <img 
                        src={thumbnailPreview || assetUrl(course.thumbnail_url)} 
                        alt="Thumbnail preview"
                        style={{ width: 150, height: 100, objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} 
                      />
                    )}
                    <label className="form-file-label" style={{ flex: 1 }}>
                      <Upload size={20} />
                      <span>{thumbnailFile ? thumbnailFile.name : 'Nhấn để chọn ảnh mới'}</span>
                      <input type="file" className="form-file-input" accept="image/*" onChange={handleThumbnailChange} />
                    </label>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thông tin cơ bản'}</button>
              </>
            )}

            {activeTab === 'pricing' && (
              <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Định giá và Cấp độ</h2>
                <div className="form-group">
                  <label className="form-label">Giá khóa học (USD)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-muted)' }}>$</span>
                    <input type="number" min="0" step="0.01" className="form-input" style={{ maxWidth: '200px' }} value={course.price} onChange={e => setCourse({...course, price: e.target.value})} />
                  </div>
                  <small style={{ color: 'var(--text-muted)' }}>Để giá 0 để cung cấp khóa học miễn phí.</small>
                </div>
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">Cấp độ khó</label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {LEVELS.map(l => (
                      <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="level" checked={course.level === l} onChange={() => setCourse({...course, level: l})} />
                        {LEVEL_LABELS[l] || l}
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '1rem' }}>{saving ? 'Đang lưu...' : 'Lưu lại'}</button>
              </>
            )}

            {activeTab === 'curriculum' && (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Chương trình học</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    {chapters.length} chương · {chapters.reduce((s, ch) => s + (ch.lessons?.length || 0), 0)} bài học · {chapters.reduce((s, ch) => s + (ch.assignments?.length || 0), 0)} bài tập
                  </p>
                </div>

                {chapters.length === 0 && !addingChapter ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '2px dashed var(--border)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                    <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Chưa có chương nào</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Tạo chương để bắt đầu cấu trúc khóa học của bạn</p>
                    <button type="button" className="btn btn-primary" onClick={() => setAddingChapter(true)}>
                      <Plus size={16} /> Tạo chương đầu tiên
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {chapters.map((ch, i) => {
                      const isCollapsed = collapsedChapters.has(ch.id);
                      const isRenaming = renamingChapter === ch.id;
                      const lessonCount = ch.lessons?.length || 0;
                      const assignCount = ch.assignments?.length || 0;
                      return (
                        <div key={ch.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                          {/* Chapter Header */}
                          <div style={{ background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface) 100%)', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: isCollapsed ? 'none' : '1px solid var(--border)' }}>
                            <GripVertical size={18} color="var(--border)" style={{ cursor: 'grab', flexShrink: 0 }} />
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>
                              {i + 1}
                            </div>
                            {isRenaming ? (
                              <input autoFocus type="text" className="form-input" value={renamingTitle}
                                onChange={e => setRenamingTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') renameChapter(ch.id); if (e.key === 'Escape') setRenamingChapter(null); }}
                                style={{ flex: 1, padding: '0.375rem 0.625rem', fontSize: '0.95rem', fontWeight: 600 }}
                              />
                            ) : (
                              <span style={{ flex: 1, fontWeight: 700, fontSize: '0.95rem' }} onDoubleClick={() => { setRenamingChapter(ch.id); setRenamingTitle(ch.title); }} title="Double-click để đổi tên">
                                {ch.title}
                              </span>
                            )}
                            {!isRenaming && (
                              <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.55rem', borderRadius: '999px', background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>{lessonCount} bài</span>
                                {assignCount > 0 && <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.55rem', borderRadius: '999px', background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>{assignCount} bài tập</span>}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }}>
                              {isRenaming ? (
                                <>
                                  <button type="button" className="btn btn-success btn-sm" style={{ padding: '0.3rem 0.5rem' }} onClick={() => renameChapter(ch.id)}><Check size={14} /></button>
                                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setRenamingChapter(null)}><X size={14} /></button>
                                </>
                              ) : (
                                <>
                                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.3rem 0.5rem' }} title="Đổi tên" onClick={() => { setRenamingChapter(ch.id); setRenamingTitle(ch.title); }}><Pencil size={14} /></button>
                                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.3rem 0.5rem', color: 'var(--error)' }} onClick={() => deleteChapter(ch.id)}><Trash2 size={14} /></button>
                                  <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.3rem 0.5rem' }} onClick={() => toggleChapter(ch.id)}>{isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Chapter Body */}
                          {!isCollapsed && (
                            <div style={{ padding: '1rem', background: 'var(--bg)' }}>
                              {/* Lessons */}
                              <div style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📹 Bài học</span>
                                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openLessonModal(ch.id)}><Plus size={13} /> Thêm bài học</button>
                                </div>
                                {ch.lessons?.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {ch.lessons.map((lesson, idx) => (
                                      <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <GripVertical size={16} color="var(--border)" style={{ cursor: 'grab', flexShrink: 0 }} />
                                        <div style={{ width: 32, height: 32, borderRadius: '8px', flexShrink: 0, background: lesson.video_url ? '#dbeafe' : lesson.file_url ? '#ede9fe' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          {lesson.video_url ? <Video size={16} color="#2563eb" /> : lesson.file_url ? <File size={16} color="#7c3aed" /> : <FileText size={16} color="#6b7280" />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idx + 1}. {lesson.title}</div>
                                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                                            {lesson.duration && <span>⏱ {lesson.duration} phút</span>}
                                            {lesson.file_name && <span>📎 {lesson.file_name}</span>}
                                            {lesson.video_url && <span>📹 Video</span>}
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                          <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.3rem 0.6rem' }} onClick={() => openLessonModal(ch.id, lesson)}><Pencil size={13} /></button>
                                          <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.3rem 0.6rem', color: 'var(--error)' }} onClick={() => deleteLesson(lesson.id)}><Trash2 size={13} /></button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div onClick={() => openLessonModal(ch.id)} style={{ padding: '1rem', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    + Nhấn để thêm bài học đầu tiên
                                  </div>
                                )}
                              </div>

                              {/* Assignments */}
                              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📝 Bài tập & Quiz</span>
                                  <button type="button" className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--border)' }} onClick={() => openAssignmentModal(ch.id)}><Plus size={13} /> Thêm bài tập</button>
                                </div>
                                {ch.assignments?.length > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {ch.assignments.map((assignment) => (
                                      <div key={assignment.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '8px', flexShrink: 0, background: assignment.type === 'quiz' ? '#dcfce7' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          {assignment.type === 'quiz' ? <ClipboardList size={16} color="#15803d" /> : <FileText size={16} color="#b45309" />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{assignment.title}</div>
                                          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', marginTop: '0.15rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span style={{ padding: '0.1rem 0.5rem', borderRadius: '999px', background: assignment.type === 'quiz' ? '#dcfce7' : '#fef3c7', color: assignment.type === 'quiz' ? '#15803d' : '#b45309', fontWeight: 600 }}>{assignment.type === 'quiz' ? 'Quiz' : 'Tự luận'}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>🎯 {assignment.total_points} điểm</span>
                                            {assignment.due_date && <span style={{ color: 'var(--text-muted)' }}>📅 {new Date(assignment.due_date).toLocaleDateString('vi-VN')}</span>}
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                          {assignment.type === 'quiz' && (
                                            <button type="button" className="btn btn-success btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => openQuizBuilder(assignment)}><ClipboardList size={13} /> Soạn</button>
                                          )}
                                          <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.3rem 0.6rem' }} onClick={() => openAssignmentModal(ch.id, assignment)}><Pencil size={13} /></button>
                                          <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.3rem 0.6rem', color: 'var(--error)' }} onClick={() => deleteAssignment(assignment.id)}><Trash2 size={13} /></button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Inline Add Chapter */}
                    {addingChapter ? (
                      <div style={{ padding: '1rem', border: '2px solid var(--primary)', borderRadius: 'var(--radius)', background: 'var(--primary-light)' }}>
                        <div style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem' }}>Thêm chương mới</div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <input autoFocus type="text" className="form-input" placeholder="VD: Giới thiệu khóa học"
                            value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addChapter(); if (e.key === 'Escape') { setAddingChapter(false); setNewChapterTitle(''); } }}
                            style={{ flex: 1 }}
                          />
                          <button type="button" className="btn btn-primary" onClick={addChapter} disabled={!newChapterTitle.trim()}><Check size={16} /> Thêm</button>
                          <button type="button" className="btn btn-ghost" onClick={() => { setAddingChapter(false); setNewChapterTitle(''); }}><X size={16} /></button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" className="btn btn-ghost" style={{ width: '100%', padding: '0.875rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', justifyContent: 'center' }} onClick={() => setAddingChapter(true)}>
                        <Plus size={16} /> Thêm chương mới
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'publish' && (() => {
              const checks = [
                { label: 'Đã có tiêu đề khóa học', done: !!course.title },
                { label: 'Đã có mô tả chi tiết', done: !!course.description },
                { label: 'Đã có ảnh thumbnail', done: !!course.thumbnail_url },
                { label: 'Ít nhất 1 chương học', done: chapters.length > 0 },
                { label: 'Ít nhất 1 bài học', done: chapters.some(ch => ch.lessons?.length > 0) },
              ];
              const allDone = checks.every(c => c.done);
              return (
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Xuất bản khóa học</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Kiểm tra các điều kiện trước khi xuất bản</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2rem' }}>
                    {checks.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', background: item.done ? '#f0fdf4' : 'var(--surface)', borderRadius: '10px', border: `1px solid ${item.done ? '#86efac' : 'var(--border)'}` }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: item.done ? '#22c55e' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {item.done ? <Check size={14} color="#fff" /> : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        <span style={{ fontWeight: 600, color: item.done ? '#15803d' : 'var(--text-muted)' }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-ghost" onClick={() => navigate(`/courses/${id}`)}>👁 Xem trước</button>
                    <button type="button" className="btn btn-primary btn-lg" disabled={!allDone} onClick={() => showToast('Khóa học đã được xuất bản! 🎉')} title={!allDone ? 'Hoàn thành tất cả điều kiện trước khi xuất bản' : ''}>
                      <CheckCircle size={18} /> Xuất bản khóa học
                    </button>
                  </div>
                  {!allDone && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>Vui lòng hoàn thành tất cả điều kiện để có thể xuất bản.</p>}
                </div>
              );
            })()}
          </form>
        </div>
      </div>

      {/* Lesson Modal */}
      {showLessonModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={closeLessonModal}>
          <div className="card" style={{
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            <button 
              type="button"
              onClick={closeLessonModal}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.5rem'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>
              {editingLesson ? 'Chỉnh sửa bài học' : 'Thêm bài học mới'}
            </h2>

            <form onSubmit={saveLessonForm}>
              <div className="form-group">
                <label className="form-label">Tiêu đề bài học *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={lessonForm.title}
                  onChange={e => setLessonForm({...lessonForm, title: e.target.value})}
                  placeholder="VD: Giới thiệu về React Hooks"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả / Nội dung</label>
                <textarea 
                  className="form-textarea" 
                  rows="4"
                  value={lessonForm.content}
                  onChange={e => setLessonForm({...lessonForm, content: e.target.value})}
                  placeholder="Mô tả chi tiết nội dung bài học..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Video size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Link YouTube / Video URL
                </label>
                <input 
                  type="url" 
                  className="form-input"
                  value={lessonForm.video_url}
                  onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Dán link YouTube, Vimeo hoặc URL video khác
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Tài liệu đính kèm (PDF, Video, ZIP Package, ...)</label>
                <label className="form-file-label">
                  <Upload size={20} />
                  <span>{lessonFile ? lessonFile.name : 'Nhấn để chọn file'}</span>
                  <input 
                    type="file" 
                    className="form-file-input"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.xlsx,.xls,.mp4,.webm,.mov,.avi,.mkv,.mp3,.wav,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip"
                    onChange={e => setLessonFile(e.target.files[0])}
                  />
                </label>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                  📦 Hỗ trợ: PDF, Video, Audio, Hình ảnh, Document, và <strong>ZIP Package</strong> (Figma export, web app, v.v.) - Max 500MB
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Thứ tự</label>
                  <input 
                    type="number" 
                    className="form-input"
                    min="0"
                    value={lessonForm.lesson_order}
                    onChange={e => setLessonForm({...lessonForm, lesson_order: e.target.value})}
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Thời lượng (phút)</label>
                  <input 
                    type="number" 
                    className="form-input"
                    min="0"
                    value={lessonForm.duration}
                    onChange={e => setLessonForm({...lessonForm, duration: e.target.value})}
                    placeholder="30"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                {saving && lessonUploadProgress > 0 && (
                  <div style={{ width: '100%', background: 'var(--surface-2)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--primary)', width: `${lessonUploadProgress}%`, transition: 'width 0.2s ease-out' }} />
                  </div>
                )}
                {saving && lessonUploadProgress > 0 && (
                  <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Đang tải lên... {lessonUploadProgress}% {lessonUploadProgress === 100 ? '(Đang xử lý, xin chờ...)' : ''}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost" onClick={closeLessonModal} disabled={saving}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Đang lưu...' : (editingLesson ? 'Cập nhật' : 'Tạo bài học')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={closeAssignmentModal}>
          <div className="card" style={{
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '2rem',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            <button 
              type="button"
              onClick={closeAssignmentModal}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '0.5rem'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>
              {editingAssignment ? 'Chỉnh sửa bài tập / Quiz' : 'Thêm bài tập / Quiz mới'}
            </h2>

            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', borderBottom: assignmentTab === 'basic' ? '2px solid var(--primary)' : '2px solid transparent', color: assignmentTab === 'basic' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setAssignmentTab('basic')}
              >
                Thông tin cơ bản
              </button>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', borderBottom: assignmentTab === 'settings' ? '2px solid var(--primary)' : '2px solid transparent', color: assignmentTab === 'settings' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setAssignmentTab('settings')}
              >
                Cài đặt nâng cao
              </button>
            </div>

            <form onSubmit={saveAssignmentForm}>
              {assignmentTab === 'basic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tiêu đề bài tập *</label>
                    <input 
                      type="text" className="form-input" required 
                      value={assignmentForm.title} onChange={e => setAssignmentForm({...assignmentForm, title: e.target.value})}
                      placeholder="VD: Bài tập về React Hooks"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Mô tả</label>
                    <textarea 
                      className="form-textarea" rows="4"
                      value={assignmentForm.description} onChange={e => setAssignmentForm({...assignmentForm, description: e.target.value})}
                      placeholder="Hướng dẫn và yêu cầu cho bài tập..."
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Loại bài tập</label>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: assignmentForm.type === 'essay' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '8px', flex: 1, background: assignmentForm.type === 'essay' ? 'var(--primary-light)' : 'transparent' }}>
                        <input type="radio" name="assignment-type" checked={assignmentForm.type === 'essay'} onChange={() => setAssignmentForm({...assignmentForm, type: 'essay'})} style={{ display: 'none' }} />
                        <FileText size={20} color={assignmentForm.type === 'essay' ? 'var(--primary)' : 'var(--text-muted)'} />
                        <div>
                          <div style={{ fontWeight: 600, color: assignmentForm.type === 'essay' ? 'var(--primary-dark)' : 'inherit' }}>Tự luận / Tải file</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Học viên gõ văn bản hoặc tải file lên</div>
                        </div>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: assignmentForm.type === 'quiz' ? '2px solid var(--success)' : '1px solid var(--border)', borderRadius: '8px', flex: 1, background: assignmentForm.type === 'quiz' ? '#f0fdf4' : 'transparent' }}>
                        <input type="radio" name="assignment-type" checked={assignmentForm.type === 'quiz'} onChange={() => setAssignmentForm({...assignmentForm, type: 'quiz'})} style={{ display: 'none' }} />
                        <ClipboardList size={20} color={assignmentForm.type === 'quiz' ? 'var(--success)' : 'var(--text-muted)'} />
                        <div>
                          <div style={{ fontWeight: 600, color: assignmentForm.type === 'quiz' ? '#166534' : 'inherit' }}>Quiz Trắc nghiệm</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Câu hỏi trắc nghiệm, đúng/sai, điền từ</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label">Tổng điểm</label>
                      <input type="number" className="form-input" min="1" max="1000" value={assignmentForm.total_points} onChange={e => setAssignmentForm({...assignmentForm, total_points: e.target.value})} placeholder="100" />
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label"><Calendar size={14} style={{ display: 'inline', marginRight: '0.25rem' }} /> Hạn nộp</label>
                      <input type="datetime-local" className="form-input" value={assignmentForm.due_date} onChange={e => setAssignmentForm({...assignmentForm, due_date: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              {assignmentTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Trạng thái</label>
                    <select className="form-select" value={assignmentForm.status} onChange={e => setAssignmentForm({...assignmentForm, status: e.target.value})}>
                      <option value="published">Đã xuất bản (Sinh viên có thể thấy)</option>
                      <option value="draft">Bản nháp (Ẩn với sinh viên)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label">Giới hạn thời gian (phút)</label>
                      <input type="number" className="form-input" min="1" value={assignmentForm.time_limit} onChange={e => setAssignmentForm({...assignmentForm, time_limit: e.target.value})} placeholder="VD: 45 (Bỏ trống nếu không giới hạn)" />
                    </div>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label">Số lần làm bài tối đa</label>
                      <input type="number" className="form-input" min="0" value={assignmentForm.max_attempts} onChange={e => setAssignmentForm({...assignmentForm, max_attempts: e.target.value})} placeholder="VD: 1 (Điền 0 nếu không giới hạn)" />
                    </div>
                  </div>

                  {assignmentForm.type === 'quiz' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--surface-2)', borderRadius: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                        <input type="checkbox" checked={assignmentForm.shuffle_questions} onChange={e => setAssignmentForm({...assignmentForm, shuffle_questions: e.target.checked})} style={{ width: '1.2rem', height: '1.2rem' }} />
                        Xáo trộn thứ tự câu hỏi
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                        <input type="checkbox" checked={assignmentForm.shuffle_options} onChange={e => setAssignmentForm({...assignmentForm, shuffle_options: e.target.checked})} style={{ width: '1.2rem', height: '1.2rem' }} />
                        Xáo trộn các đáp án trong câu hỏi
                      </label>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                        <input type="checkbox" checked={assignmentForm.allow_resubmit} onChange={e => setAssignmentForm({...assignmentForm, allow_resubmit: e.target.checked})} style={{ width: '1.2rem', height: '1.2rem' }} />
                        Cho phép nộp lại bài khi chưa chấm điểm
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-ghost" onClick={closeAssignmentModal}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : (editingAssignment ? 'Cập nhật' : 'Tạo bài tập')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== QUIZ BUILDER (iSpring-like) ===== */}
      {showQuizBuilder && quizBuilderAssignment && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg)', zIndex: 2000, display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Top Toolbar */}
          <div style={{
            background: '#1e293b', color: '#fff', padding: '0.75rem 1.5rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-ghost" style={{ color: '#94a3b8', padding: '0.25rem' }} onClick={closeQuizBuilder}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{quizBuilderAssignment.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {quizQuestions.length} câu hỏi · {quizQuestions.reduce((s, q) => s + (q.points || 0), 0)} điểm tổng
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                className={`btn btn-sm ${quizPreview ? 'btn-warning' : 'btn-ghost'}`}
                style={{ color: quizPreview ? undefined : '#cbd5e1' }}
                onClick={() => { setQuizPreview(!quizPreview); setPreviewAnswers({}); setPreviewSubmitted(false); }}
              >
                <Eye size={15} /> {quizPreview ? 'Thoát xem thử' : 'Xem thử'}
              </button>
              <button className="btn btn-success btn-sm" onClick={saveQuizQuestions} disabled={quizSaving}>
                <Save size={15} /> {quizSaving ? 'Đang lưu...' : 'Lưu tất cả'}
              </button>
              <button className="btn btn-ghost btn-sm" style={{ color: '#94a3b8' }} onClick={closeQuizBuilder}>
                <X size={18} />
              </button>
            </div>
          </div>

          {quizPreview ? (
            /* ===== PREVIEW MODE ===== */
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{quizBuilderAssignment.title}</h2>
                  <p style={{ color: 'var(--text-muted)' }}>{quizQuestions.length} câu hỏi · Tổng điểm: {quizQuestions.reduce((s, q) => s + (q.points || 0), 0)}</p>
                </div>
                {quizQuestions.map((q, i) => {
                  const filledOpts = q.options.filter(o => o.trim());
                  return (
                    <div key={i} className="card" style={{ padding: '1.5rem', marginBottom: '1rem', border: previewSubmitted ? (previewAnswers[i] === q.correct_option ? '2px solid var(--success)' : previewAnswers[i] !== undefined ? '2px solid var(--error)' : '2px solid var(--border)') : '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>Câu {i + 1}. {q.question_text || '(Chưa nhập câu hỏi)'}</h4>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flexShrink: 0 }}>{q.points} điểm</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filledOpts.map((opt, oIdx) => {
                          const isSelected = previewAnswers[i] === oIdx;
                          const isCorrect = oIdx === q.correct_option;
                          let bg = 'var(--bg)';
                          let border = '1px solid var(--border)';
                          if (previewSubmitted && isCorrect) { bg = '#dcfce7'; border = '2px solid var(--success)'; }
                          else if (previewSubmitted && isSelected && !isCorrect) { bg = '#fee2e2'; border = '2px solid var(--error)'; }
                          else if (isSelected) { bg = 'var(--primary-light)'; border = '2px solid var(--primary)'; }
                          return (
                            <label key={oIdx} style={{
                              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                              borderRadius: '8px', cursor: previewSubmitted ? 'default' : 'pointer',
                              background: bg, border, transition: 'all 0.15s'
                            }} onClick={() => { if (!previewSubmitted) setPreviewAnswers({ ...previewAnswers, [i]: oIdx }); }}>
                              <div style={{
                                width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                background: isSelected ? 'var(--primary)' : '#fff'
                              }}>
                                {isSelected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                              </div>
                              <span style={{ fontSize: '0.95rem' }}>{opt}</span>
                              {previewSubmitted && isCorrect && <CheckCircle2 size={16} color="var(--success)" style={{ marginLeft: 'auto' }} />}
                              {previewSubmitted && isSelected && !isCorrect && <AlertCircle size={16} color="var(--error)" style={{ marginLeft: 'auto' }} />}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  {!previewSubmitted ? (
                    <button className="btn btn-primary btn-lg" onClick={() => setPreviewSubmitted(true)}>
                      Nộp bài
                    </button>
                  ) : (
                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                        Kết quả: {quizQuestions.filter((q, i) => previewAnswers[i] === q.correct_option).length} / {quizQuestions.length} câu đúng
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        Điểm: {quizQuestions.reduce((s, q, i) => s + (previewAnswers[i] === q.correct_option ? q.points : 0), 0)} / {quizQuestions.reduce((s, q) => s + q.points, 0)}
                      </div>
                      <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => { setPreviewAnswers({}); setPreviewSubmitted(false); }}>
                        Làm lại
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ===== EDITOR MODE ===== */
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Left Panel: Question List */}
              <div style={{
                width: '280px', background: 'var(--surface)', borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', flexShrink: 0
              }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Danh sách câu hỏi</span>
                  <button className="btn btn-primary btn-sm" onClick={addQuizQuestion} style={{ padding: '0.25rem 0.5rem' }}>
                    <Plus size={14} />
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                  {quizQuestions.map((q, i) => {
                    const hasContent = q.question_text.trim();
                    const filledOpts = q.options.filter(o => o.trim()).length;
                    const isValid = hasContent && filledOpts >= 2;
                    return (
                      <div
                        key={i}
                        onClick={() => setActiveQuestionIdx(i)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                          padding: '0.75rem', marginBottom: '4px', borderRadius: '8px', cursor: 'pointer',
                          background: activeQuestionIdx === i ? 'var(--primary-light)' : 'transparent',
                          border: activeQuestionIdx === i ? '1px solid var(--primary)' : '1px solid transparent',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: isValid ? 'var(--success)' : 'var(--border)',
                          color: isValid ? '#fff' : 'var(--text-muted)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.8rem', fontWeight: 700
                        }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.85rem', fontWeight: 600,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            color: activeQuestionIdx === i ? 'var(--primary-dark)' : 'var(--text)'
                          }}>
                            {q.question_text || 'Câu hỏi mới...'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {filledOpts} đáp án · {q.points} đ
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Bottom actions */}
                <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={addQuizQuestion}>
                    <Plus size={14} /> Thêm câu hỏi
                  </button>
                </div>
              </div>

              {/* Right Panel: Question Editor */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                {quizQuestions[activeQuestionIdx] && (() => {
                  const q = quizQuestions[activeQuestionIdx];
                  const qIdx = activeQuestionIdx;
                  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
                  const optionColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

                  return (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                      {/* Question Navigation */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button className="btn btn-ghost btn-sm" disabled={qIdx === 0} onClick={() => setActiveQuestionIdx(qIdx - 1)}>
                            <ChevronLeft size={16} />
                          </button>
                          <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                            Câu {qIdx + 1} / {quizQuestions.length}
                          </span>
                          <button className="btn btn-ghost btn-sm" disabled={qIdx === quizQuestions.length - 1} onClick={() => setActiveQuestionIdx(qIdx + 1)}>
                            <ChevronRight size={16} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-ghost btn-sm" title="Nhân đôi" onClick={() => duplicateQuestion(qIdx)}>
                            <Copy size={14} /> Nhân đôi
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} title="Xóa" onClick={() => removeQuizQuestion(qIdx)}>
                            <Trash2 size={14} /> Xóa
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <label style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem', display: 'block' }}>
                          Nội dung câu hỏi
                        </label>
                        <textarea
                          className="form-textarea"
                          rows="3"
                          placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                          value={q.question_text}
                          onChange={e => updateQuizQuestion(qIdx, 'question_text', e.target.value)}
                          style={{ fontSize: '1.05rem', fontWeight: 500 }}
                        />
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Điểm</label>
                            <input
                              type="number" className="form-input" min="1" max="100"
                              value={q.points}
                              onChange={e => updateQuizQuestion(qIdx, 'points', parseInt(e.target.value) || 10)}
                              style={{ width: '100px' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <label style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            Các đáp án <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.85rem' }}>(nhấn vào đáp án đúng)</span>
                          </label>
                          {q.options.length < 6 && (
                            <button className="btn btn-ghost btn-sm" onClick={() => addOption(qIdx)}>
                              <Plus size={14} /> Thêm đáp án
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = q.correct_option === oIdx;
                            return (
                              <div key={oIdx} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.75rem 1rem', borderRadius: '10px',
                                background: isCorrect ? '#dcfce7' : 'var(--bg)',
                                border: isCorrect ? '2px solid var(--success)' : '1px solid var(--border)',
                                transition: 'all 0.2s'
                              }}>
                                {/* Option Label */}
                                <div
                                  onClick={() => updateQuizQuestion(qIdx, 'correct_option', oIdx)}
                                  style={{
                                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                    background: isCorrect ? 'var(--success)' : optionColors[oIdx] || '#6b7280',
                                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                                    transition: 'transform 0.15s', boxShadow: isCorrect ? '0 0 0 3px rgba(34,197,94,0.3)' : 'none'
                                  }}
                                  title={isCorrect ? 'Đáp án đúng' : 'Nhấn để chọn đáp án đúng'}
                                >
                                  {isCorrect ? <CheckCircle2 size={18} /> : optionLabels[oIdx]}
                                </div>

                                {/* Option Input */}
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder={`Đáp án ${optionLabels[oIdx]}`}
                                  value={opt}
                                  onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                  style={{
                                    flex: 1, border: 'none', background: 'transparent', padding: '0.5rem',
                                    fontSize: '1rem', outline: 'none'
                                  }}
                                />

                                {/* Remove Option */}
                                {q.options.length > 2 && (
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ color: 'var(--text-muted)', padding: '0.25rem', flexShrink: 0 }}
                                    onClick={() => removeOption(qIdx, oIdx)}
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {q.options.length < 6 && (
                          <button
                            className="btn btn-ghost"
                            style={{ width: '100%', marginTop: '0.75rem', border: '2px dashed var(--border)', borderRadius: '10px', padding: '0.75rem', color: 'var(--text-muted)' }}
                            onClick={() => addOption(qIdx)}
                          >
                            <Plus size={16} /> Thêm đáp án
                          </button>
                        )}
                      </div>

                      {/* Quick Nav */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                        <button className="btn btn-secondary" disabled={qIdx === 0} onClick={() => setActiveQuestionIdx(qIdx - 1)}>
                          ← Câu trước
                        </button>
                        {qIdx === quizQuestions.length - 1 ? (
                          <button className="btn btn-primary" onClick={addQuizQuestion}>
                            <Plus size={16} /> Thêm câu mới
                          </button>
                        ) : (
                          <button className="btn btn-primary" onClick={() => setActiveQuestionIdx(qIdx + 1)}>
                            Câu tiếp →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '0.875rem 1.25rem',
          background: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#d97706',
          color: '#fff', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          fontSize: '0.9rem', fontWeight: 600, maxWidth: '360px',
          animation: 'slideInRight 0.3s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default CourseEditor;
