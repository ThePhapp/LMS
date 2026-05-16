import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { ArrowLeft, Plus, Trash2, CheckCircle, X, Clock, Award, Users, FileText, Settings, BarChart2 } from 'lucide-react';
import AssignmentViewer from '../components/AssignmentViewer';

const AssignmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [assignment, setAssignment] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, questions, settings, stats
  
  // Question Form
  const [showQModal, setShowQModal] = useState(false);
  const [qForm, setQForm] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_option: 0,
    correct_answer: '',
    points: 10,
    question_order: 0
  });

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const fetchAssignment = async () => {
    try {
      const res = await api.get(`/assignments/${id}`);
      setAssignment(res.data);
      
      if (user.role === 'lecturer' || user.role === 'admin') {
        const statsRes = await api.get(`/assignments/${id}/stats`);
        setStats(statsRes.data);
      }
    } catch (err) {
      alert('Không thể tải bài tập');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const openQModal = (q = null) => {
    if (q) {
      setQForm({ ...q, options: q.options || [] });
    } else {
      setQForm({
        question_text: '', question_type: 'multiple_choice',
        options: ['', '', '', ''], correct_option: 0,
        correct_answer: '', points: 10,
        question_order: assignment?.questions?.length || 0
      });
    }
    setShowQModal(true);
  };

  const saveQuestion = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (qForm.id) {
        await api.put(`/assignments/questions/${qForm.id}`, qForm);
      } else {
        await api.post(`/assignments/${id}/questions`, qForm);
      }
      setShowQModal(false);
      fetchAssignment();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi lưu câu hỏi');
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (qId) => {
    if (!window.confirm('Xóa câu hỏi này?')) return;
    try {
      await api.delete(`/assignments/questions/${qId}`);
      fetchAssignment();
    } catch (err) {
      alert('Lỗi xóa câu hỏi');
    }
  };

  if (loading) return <div className="loading-wrapper"><div className="spinner" /></div>;
  if (!assignment) return null;

  const isInstructor = user.role === 'lecturer' || user.role === 'admin';
  const isQuiz = assignment.type === 'quiz';

  return (
    <div className="main-content">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }} onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Quay lại
      </button>

      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h1 className="page-title">{assignment.title}</h1>
            <span className={`badge ${isQuiz ? 'badge-primary' : 'badge-warning'}`}>
              {isQuiz ? 'Quiz' : 'Essay'}
            </span>
            <span className={`badge ${assignment.status === 'published' ? 'badge-success' : 'badge-ghost'}`}>
              {assignment.status === 'published' ? 'Đã đăng' : 'Bản nháp'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <span><Award size={14} style={{ display:'inline', marginRight:4 }}/> {assignment.total_points} điểm</span>
            {assignment.due_date && <span><Clock size={14} style={{ display:'inline', marginRight:4 }}/> Hạn: {new Date(assignment.due_date).toLocaleString('vi-VN')}</span>}
          </div>
        </div>
        {isInstructor && (
          <button className="btn btn-primary" onClick={() => navigate(`/instructor/assignment/${id}/grading`)}>
            <Users size={16} /> Chấm bài
          </button>
        )}
      </div>

      {isInstructor && (
        <div className="tabs">
          <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Tổng quan</button>
          {isQuiz && <button className={`tab ${activeTab === 'questions' ? 'active' : ''}`} onClick={() => setActiveTab('questions')}>Câu hỏi ({assignment.questions?.length || 0})</button>}
          <button className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Thống kê</button>
        </div>
      )}

      {/* Overview Tab (or Student View) */}
      {(!isInstructor || activeTab === 'overview') && (
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          {assignment.description && (
            <div style={{ padding: '1.5rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Mô tả</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{assignment.description}</p>
            </div>
          )}

          {!isInstructor && (
             <AssignmentViewer 
               assignment={assignment} 
               onSubmissionSuccess={fetchAssignment}
             />
          )}
        </div>
      )}

      {/* Stats Tab */}
      {isInstructor && activeTab === 'stats' && stats && (
        <div className="stats-grid">
          <div className="stat-card indigo">
            <div className="stat-label">Tổng học sinh</div>
            <div className="stat-value">{stats.total_students}</div>
          </div>
          <div className="stat-card cyan">
            <div className="stat-label">Đã nộp bài</div>
            <div className="stat-value">{stats.submitted_count} <span style={{fontSize:'1rem', color:'var(--text-muted)'}}>({stats.completion_rate}%)</span></div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Điểm trung bình</div>
            <div className="stat-value">{stats.average_score} <span style={{fontSize:'1rem', color:'var(--text-muted)'}}>/ {stats.total_points}</span></div>
          </div>
        </div>
      )}

      {/* Questions Tab */}
      {isInstructor && activeTab === 'questions' && isQuiz && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={() => openQModal()}>
              <Plus size={16} /> Thêm câu hỏi
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {assignment.questions?.map((q, idx) => (
              <div key={q.id} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      Câu {idx + 1}: {q.question_text}
                      <span className="badge badge-ghost">{q.question_type}</span>
                    </div>
                    
                    {q.question_type === 'multiple_choice' || q.question_type === 'true_false' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} style={{ 
                            padding: '0.5rem', borderRadius: '4px',
                            background: q.correct_option === oIdx ? 'var(--success)' : 'var(--bg)',
                            color: q.correct_option === oIdx ? '#fff' : 'inherit'
                          }}>
                            {String.fromCharCode(65 + oIdx)}. {opt}
                            {q.correct_option === oIdx && <CheckCircle size={14} style={{ marginLeft: 8, display:'inline' }} />}
                          </div>
                        ))}
                      </div>
                    ) : q.question_type === 'fill_blank' ? (
                      <div style={{ color: 'var(--success)', fontWeight: 600 }}>Đáp án: {q.correct_answer}</div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)' }}>Câu hỏi tự luận (chấm tay)</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '1rem' }}>
                    <span className="badge badge-primary">{q.points} điểm</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => openQModal(q)}><Settings size={14} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteQuestion(q.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            {(!assignment.questions || assignment.questions.length === 0) && (
              <div className="empty-state">
                <div className="empty-state-icon">❓</div>
                <h3>Chưa có câu hỏi nào</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQModal && (
        <div className="modal-overlay" onClick={() => setShowQModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{qForm.id ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</div>
              <button className="btn btn-ghost" onClick={() => setShowQModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={saveQuestion}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Loại câu hỏi</label>
                  <select 
                    className="form-select" 
                    value={qForm.question_type}
                    onChange={e => setQForm({...qForm, question_type: e.target.value})}
                  >
                    <option value="multiple_choice">Trắc nghiệm</option>
                    <option value="true_false">Đúng / Sai</option>
                    <option value="fill_blank">Điền từ</option>
                    <option value="essay">Tự luận</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Câu hỏi</label>
                  <textarea 
                    className="form-textarea" required rows={3}
                    value={qForm.question_text}
                    onChange={e => setQForm({...qForm, question_text: e.target.value})}
                  />
                </div>

                {qForm.question_type === 'multiple_choice' && (
                  <div className="form-group">
                    <label className="form-label">Các đáp án</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {qForm.options.map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input 
                            type="radio" name="correct" checked={qForm.correct_option === idx}
                            onChange={() => setQForm({...qForm, correct_option: idx})}
                          />
                          <input 
                            type="text" className="form-input" required value={opt}
                            onChange={e => {
                              const newOpts = [...qForm.options];
                              newOpts[idx] = e.target.value;
                              setQForm({...qForm, options: newOpts});
                            }}
                          />
                          {qForm.options.length > 2 && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                              const newOpts = qForm.options.filter((_, i) => i !== idx);
                              setQForm({...qForm, options: newOpts});
                            }}><Trash2 size={14}/></button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setQForm({...qForm, options: [...qForm.options, '']})}>
                      <Plus size={14} /> Thêm đáp án
                    </button>
                  </div>
                )}

                {qForm.question_type === 'true_false' && (
                  <div className="form-group">
                    <label className="form-label">Đáp án đúng</label>
                    <select className="form-select" value={qForm.correct_option} onChange={e => setQForm({...qForm, correct_option: parseInt(e.target.value), options: ['True', 'False']})}>
                      <option value={0}>Đúng (True)</option>
                      <option value={1}>Sai (False)</option>
                    </select>
                  </div>
                )}

                {qForm.question_type === 'fill_blank' && (
                  <div className="form-group">
                    <label className="form-label">Từ cần điền (đáp án đúng)</label>
                    <input type="text" className="form-input" required value={qForm.correct_answer || ''} onChange={e => setQForm({...qForm, correct_answer: e.target.value})} />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Điểm</label>
                  <input type="number" className="form-input" min="1" required value={qForm.points} onChange={e => setQForm({...qForm, points: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowQModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetail;
