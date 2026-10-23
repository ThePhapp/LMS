import React, { useCallback, useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { Download, ArrowLeft, CheckCircle2, ClipboardList, AlertCircle } from 'lucide-react';

const Gradebook = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [data, setData] = useState({ assignments: [], students: [] });
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubmissions, setSelectedSubmissions] = useState(null); // When reviewing an assignment
  const [gradingSubId, setGradingSubId] = useState(null);
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '' });

  const fetchData = useCallback(async () => {
    try {
      const [courseRes, gradesRes] = await Promise.all([
        api.get(`/courses/${id}`),
        api.get(`/assignments/course/${id}/grades`)
      ]);
      setCourse(courseRes.data);
      setData(gradesRes.data);
    } catch {
      alert('Không thể tải sổ điểm');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (user?.role !== 'lecturer' && user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [fetchData, navigate, user?.role]);

  const fetchSubmissions = async (assignmentId) => {
    try {
      const res = await api.get(`/assignments/${assignmentId}/submissions`);
      // Attach assignment details to context
      const assignment = data.assignments.find(a => a.id === assignmentId);
      setSelectedSubmissions({ assignment, items: res.data });
    } catch {
      alert('Không thể tải bài nộp');
    }
  };

  const submitGrade = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/assignments/submissions/${gradingSubId}`, gradeForm);
      setGradingSubId(null);
      setGradeForm({ score: '', feedback: '' });
      fetchSubmissions(selectedSubmissions.assignment.id);
      fetchData(); // update main gradebook
    } catch {
      alert('Không thể lưu điểm');
    }
  };

  const exportCSV = () => {
    const headers = ['Student ID', 'Student Name', 'Email', 'Progress (%)'];
    data.assignments.forEach(a => headers.push(`${a.title} (Max: ${a.total_points})`));

    const rows = data.students.map(s => {
      const row = [s.id, s.name, s.email, s.progress];
      data.assignments.forEach(a => {
        row.push(s.grades?.[a.id] !== undefined ? s.grades[a.id] : 'No Record');
      });
      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(x => `"${x}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gradebook-${course?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="loading-wrapper"><div className="spinner" /><p>Đang tải sổ điểm...</p></div>;

  return (
    <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '0 1.5rem' }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }} onClick={() => navigate(`/courses/${id}`)}>
        <ArrowLeft size={15} /> Quay lại khóa học
      </button>

      <div className="card" style={{ padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <ClipboardList size={16} /> Sổ điểm
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{course?.title}</h1>
          </div>
          <div>
            <button className="btn btn-primary" onClick={exportCSV}>
              <Download size={15} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {!selectedSubmissions ? (
        <div className="card">
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tổng quan học viên</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-alt)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Student</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, width: 100 }}>Progress</th>
                  {data.assignments.map(a => (
                    <th key={a.id} style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                      <div style={{ marginBottom: 4 }}>{a.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.total_points} pts</div>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '2px 6px', marginTop: 4, color: 'var(--primary)' }}
                        onClick={() => fetchSubmissions(a.id)}>Review All</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.students.length === 0 ? (
                  <tr>
                    <td colSpan={data.assignments.length + 2} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chưa có học viên đăng ký.
                    </td>
                  </tr>
                ) : (
                  data.students.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-alt)' } }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.email}</div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, color: s.progress === 100 ? 'var(--success)' : 'inherit' }}>{s.progress}%</span>
                          {s.progress === 100 && <CheckCircle2 size={14} color="var(--success)" />}
                        </div>
                      </td>
                      {data.assignments.map(a => (
                        <td key={a.id} style={{ padding: '1rem 1.5rem', color: s.grades?.[a.id] !== undefined ? 'var(--text)' : 'var(--text-muted)' }}>
                          {s.grades?.[a.id] !== undefined ? <strong>{s.grades[a.id]}</strong> : '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSubmissions(null)} style={{ marginBottom: '1rem' }}>
            <ArrowLeft size={14} /> Quay lại tổng quan
          </button>
          
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Submissions: {selectedSubmissions.assignment.title}
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Danh sách hiển thị tất cả lượt nộp, mới nhất ở trên. Chỉ điểm cao nhất được tính vào sổ điểm.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {selectedSubmissions.items.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-alt)', borderRadius: '0.5rem' }}>
                  No submissions yet.
                </div>
              ) : (
                selectedSubmissions.items.map(sub => (
                  <div key={sub.id} style={{ border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{sub.student_name} ({sub.student_email})</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>Submitted: {new Date(sub.submitted_at).toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {sub.status === 'graded' ? (
                          <div className="badge badge-success" style={{ fontSize: '1rem', padding: '0.3rem 0.8rem' }}>Điểm: {sub.score} / {selectedSubmissions.assignment.total_points}</div>
                        ) : (
                          <div className="badge badge-warning" style={{ fontSize: '0.9rem' }}><AlertCircle size={14} /> Chờ chấm</div>
                        )}
                        <button className="btn btn-primary btn-sm" onClick={() => setGradingSubId(sub.id)}>
                          {sub.status === 'graded' ? 'Cập nhật điểm' : 'Chấm bài'}
                        </button>
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg)', padding: '1.5rem', borderRadius: '0.5rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.95rem' }}>
                      {sub.content ? sub.content : (
                        <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>[Quiz answers stored as JSON: {sub.answers}]</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grade Modal */}
      {gradingSubId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
             <div className="modal-header">
               <h2 className="modal-title">Nhập điểm</h2>
               <button className="btn btn-ghost btn-sm" onClick={() => setGradingSubId(null)}>✕</button>
             </div>
             <form onSubmit={submitGrade}>
               <div className="modal-body">
                 <div className="form-group">
                   <label className="form-label">Điểm (tối đa: {selectedSubmissions.assignment.total_points})</label>
                   <input type="number" className="form-input" required 
                     max={selectedSubmissions.assignment.total_points} min="0"
                     value={gradeForm.score} onChange={e => setGradeForm({ ...gradeForm, score: e.target.value })} />
                 </div>
                 <div className="form-group">
                   <label className="form-label">Nhận xét (không bắt buộc)</label>
                   <textarea className="form-textarea" rows="3"
                     value={gradeForm.feedback} onChange={e => setGradeForm({ ...gradeForm, feedback: e.target.value })} />
                 </div>
               </div>
               <div className="modal-footer">
                 <button type="button" className="btn btn-secondary" onClick={() => setGradingSubId(null)}>Hủy</button>
                 <button type="submit" className="btn btn-primary">Lưu điểm</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gradebook;
