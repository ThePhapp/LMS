import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { assetUrl } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { ArrowLeft, FileText, CheckCircle, Clock, Send, Download, Eye, Award } from 'lucide-react';

const AssignmentGrading = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionFileAccess, setSubmissionFileAccess] = useState(null);
  const [showGradeModal, setShowGradeModal] = useState(false);

  // Grading form
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'lecturer' && user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [assignmentId, user]);

  useEffect(() => {
    let cancelled = false;
    setSubmissionFileAccess(null);
    if (!selectedSubmission?.file_url) return () => { cancelled = true; };

    const accessPath = (selectedSubmission.file_access_url
      || `/api/files/submissions/${selectedSubmission.id}/access`).replace(/^\/api/, '');
    api.get(accessPath).then((response) => {
      if (!cancelled) {
        setSubmissionFileAccess({
          ...response.data,
          url: assetUrl(response.data.url),
          downloadUrl: assetUrl(response.data.downloadUrl),
        });
      }
    }).catch(() => {
      if (!cancelled) setSubmissionFileAccess({ error: true });
    });

    return () => { cancelled = true; };
  }, [selectedSubmission]);

  const fetchData = async () => {
    try {
      const [assignmentRes, submissionsRes] = await Promise.all([
        api.get(`/assignments/${assignmentId}`),
        api.get(`/assignments/${assignmentId}/submissions`)
      ]);
      setAssignment(assignmentRes.data);
      setSubmissions(submissionsRes.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi tải dữ liệu');
      navigate('/instructor/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const openGradeModal = (submission) => {
    setSelectedSubmission(submission);
    setScore(submission.score !== null ? submission.score : '');
    setFeedback(submission.feedback || '');
    setShowGradeModal(true);
  };

  const closeGradeModal = () => {
    setShowGradeModal(false);
    setSelectedSubmission(null);
    setScore('');
    setFeedback('');
  };

  const handleGrade = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > assignment.total_points) {
      alert(`Điểm phải từ 0 đến ${assignment.total_points}`);
      return;
    }

    setGrading(true);
    try {
      await api.put(`/assignments/submissions/${selectedSubmission.id}`, {
        score: scoreNum,
        feedback
      });
      alert('Đã chấm bài thành công!');
      closeGradeModal();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi chấm bài');
    } finally {
      setGrading(false);
    }
  };

  if (loading) return <div className="loading-wrapper"><div className="spinner" /><p>Đang tải...</p></div>;
  if (!assignment) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const gradedCount = submissions.filter(s => s.status === 'graded').length;
  const pendingCount = submissions.filter(s => s.status === 'submitted').length;
  const avgScore = submissions.length > 0 && submissions.filter(s => s.score !== null).length > 0
    ? (submissions.filter(s => s.score !== null).reduce((acc, s) => acc + s.score, 0) / submissions.filter(s => s.score !== null).length).toFixed(1)
    : 0;

  return (
    <div className="main-content">
      <button 
        className="btn btn-ghost btn-sm" 
        style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }} 
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} /> Quay lại
      </button>

      {/* Header */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: 50, height: 50, borderRadius: '12px',
                background: 'var(--primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)'
              }}>
                <FileText size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                  {assignment.title}
                </h2>
                <span className={`badge ${assignment.type === 'quiz' ? 'badge-primary' : 'badge-warning'}`}>
                  {assignment.type === 'quiz' ? 'Quiz' : 'Essay'}
                </span>
              </div>
            </div>
            {assignment.description && (
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                {assignment.description}
              </p>
            )}
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <strong>Tổng điểm:</strong> {assignment.total_points} điểm
              {assignment.due_date && (
                <span style={{ marginLeft: '1.5rem' }}>
                  <strong>Hạn nộp:</strong> {formatDate(assignment.due_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 50, height: 50, borderRadius: '12px',
              background: 'var(--primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Send size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{submissions.length}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tổng bài nộp</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 50, height: 50, borderRadius: '12px',
              background: '#dcfce7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#16a34a'
            }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{gradedCount}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Đã chấm</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 50, height: 50, borderRadius: '12px',
              background: 'var(--warning-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--warning)'
            }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{pendingCount}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chờ chấm</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 50, height: 50, borderRadius: '12px',
              background: 'var(--accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <Award size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                {submissions.filter(s => s.score !== null).length > 0 ? avgScore : '-'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Điểm TB</div>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="card">
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Danh sách bài nộp ({submissions.length})
          </h3>
        </div>

        {submissions.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có sinh viên nào nộp bài
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Sinh viên</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Thời gian nộp</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Điểm</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Trạng thái</th>
                  <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
                        }}>
                          {sub.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{sub.student_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sub.student_email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                      {formatDate(sub.submitted_at)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {sub.score !== null ? (
                        <span style={{
                          fontSize: '1.1rem', fontWeight: 700,
                          color: sub.score >= assignment.total_points * 0.7 ? 'var(--success)' : 
                                 sub.score >= assignment.total_points * 0.5 ? 'var(--warning)' : 'var(--error)'
                        }}>
                          {sub.score}/{assignment.total_points}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {sub.status === 'graded' ? (
                        <span className="badge badge-success">Đã chấm</span>
                      ) : (
                        <span className="badge badge-warning">Chờ chấm</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => openGradeModal(sub)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <Eye size={14} />
                        {sub.status === 'graded' ? 'Xem & Sửa' : 'Chấm bài'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grade Modal */}
      {showGradeModal && selectedSubmission && (
        <div className="modal-overlay" onClick={closeGradeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Chấm bài - {selectedSubmission.student_name}
              </h3>
              <button onClick={closeGradeModal} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem' }}>
              {/* Student Info */}
              <div style={{ 
                padding: '1rem', borderRadius: 'var(--radius)', 
                background: 'var(--surface-2)', marginBottom: '1.5rem' 
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <strong>Sinh viên:</strong> {selectedSubmission.student_name} ({selectedSubmission.student_email})
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <strong>Nộp lúc:</strong> {formatDate(selectedSubmission.submitted_at)}
                </div>
              </div>

              {/* Submission Content */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Bài làm:</h4>
                
                {assignment.type === 'quiz' ? (
                  <div style={{ 
                    padding: '1rem', borderRadius: 'var(--radius)', 
                    background: 'var(--bg)', border: '1px solid var(--border)' 
                  }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Quiz được tự động chấm điểm
                    </div>
                  </div>
                ) : (
                  <>
                    {selectedSubmission.content && (
                      <div style={{ 
                        padding: '1rem', borderRadius: 'var(--radius)', 
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        marginBottom: '1rem', whiteSpace: 'pre-wrap'
                      }}>
                        {selectedSubmission.content}
                      </div>
                    )}
                    {selectedSubmission.file_url && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileText size={20} style={{ color: 'var(--primary)' }} />
                        <a
                          href={submissionFileAccess?.downloadUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-secondary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <Download size={14} />
                          Tải file đính kèm
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Grading Form */}
              <form onSubmit={handleGrade}>
                <div className="form-group">
                  <label className="form-label">
                    Điểm (tối đa {assignment.total_points})
                    <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    max={assignment.total_points}
                    step="0.1"
                    value={score}
                    onChange={e => setScore(e.target.value)}
                    required
                    placeholder={`Nhập điểm từ 0 đến ${assignment.total_points}`}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nhận xét/Phản hồi</label>
                  <textarea
                    className="form-textarea"
                    rows="4"
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Nhập nhận xét, góp ý cho sinh viên..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={closeGradeModal}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={grading}>
                    {grading ? 'Đang lưu...' : 'Lưu điểm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentGrading;
