import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { CheckCircle2, AlertCircle, Clock, Award, ChevronLeft, ChevronRight, Circle, Play } from 'lucide-react';

const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
const optionColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AssignmentViewer = ({ assignment, onSubmissionSuccess }) => {
  const { user } = useContext(AuthContext);

  const isQuiz = assignment.type === 'quiz';
  const isPastDue = assignment.due_date && new Date() > new Date(assignment.due_date);
  const questions = assignment.questions || [];

  const [answers, setAnswers] = useState({});
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeQIdx, setActiveQIdx] = useState(0);
  
  const [takingQuiz, setTakingQuiz] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  
  const [submittedResult, setSubmittedResult] = useState(null);
  const [reviewingSub, setReviewingSub] = useState(null);

  const attemptCount = assignment.attempt_count || 0;
  const canTakeQuiz = isQuiz && (assignment.max_attempts === 0 || attemptCount < assignment.max_attempts) && !isPastDue;
  
  useEffect(() => {
    // If it's a quiz, try to load saved answers from localStorage
    if (isQuiz && takingQuiz) {
      const saved = localStorage.getItem(`quiz_answers_${assignment.id}`);
      if (saved) setAnswers(JSON.parse(saved));
    }
  }, [takingQuiz]);

  useEffect(() => {
    // Timer logic
    if (takingQuiz && timeLeft !== null && timeLeft > 0) {
      const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timerId);
    } else if (takingQuiz && timeLeft === 0) {
      handleSubmit(new Event('submit')); // auto submit
    }
  }, [takingQuiz, timeLeft]);

  const startQuiz = () => {
    setTakingQuiz(true);
    setAnswers({});
    setSubmittedResult(null);
    if (assignment.time_limit) {
      setTimeLeft(assignment.time_limit * 60);
    }
  };

  const handleAnswerChange = (qId, value) => {
    const newAnswers = { ...answers, [qId]: value };
    setAnswers(newAnswers);
    if (isQuiz) {
      localStorage.setItem(`quiz_answers_${assignment.id}`, JSON.stringify(newAnswers));
    }
  };

  const handleSubmit = async (e) => {
    if(e && e.preventDefault) e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      if (isQuiz) {
        const res = await api.post(`/assignments/${assignment.id}`, { answers });
        setSubmittedResult(res.data);
        setTakingQuiz(false);
        localStorage.removeItem(`quiz_answers_${assignment.id}`);
      } else {
        const fd = new FormData();
        fd.append('content', content);
        if (file) fd.append('file', file);
        await api.post(`/assignments/${assignment.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        alert('Nộp bài thành công!');
        setContent('');
        setFile(null);
      }
      if (onSubmissionSuccess) onSubmissionSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi nộp bài');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div>
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.9rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={16} color="var(--primary)" />
          <span><strong>Tổng điểm:</strong> {assignment.total_points}</span>
        </div>
        {assignment.time_limit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} />
            <span><strong>Thời gian:</strong> {assignment.time_limit} phút</span>
          </div>
        )}
        {assignment.max_attempts > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Circle size={16} />
            <span><strong>Số lần làm:</strong> {attemptCount}/{assignment.max_attempts}</span>
          </div>
        )}
      </div>

      {assignment.my_submissions && assignment.my_submissions.length > 0 && !takingQuiz && !submittedResult && !reviewingSub && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Lịch sử nộp bài ({attemptCount} lần)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {assignment.my_submissions.map((sub, i) => (
              <div key={sub.id} style={{
                padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Lần {sub.attempt_number} - {new Date(sub.submitted_at).toLocaleString('vi-VN')}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Trạng thái: {sub.status}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.2rem', color: sub.score !== null ? 'var(--success)' : 'var(--warning)' }}>
                    {sub.score !== null ? `${sub.score} điểm` : 'Chờ chấm'}
                  </div>
                  {isQuiz && <button className="btn btn-secondary btn-sm" onClick={() => setReviewingSub(sub)}>Xem lại bài</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVIEW MODE UI */}
      {reviewingSub && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Xem lại: Lần {reviewingSub.attempt_number}</h3>
            <button className="btn btn-ghost" onClick={() => setReviewingSub(null)}>
              <ChevronLeft size={16} /> Quay lại
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {questions.map((q, idx) => {
              const studentAnswer = reviewingSub.answers?.[q.id];
              return (
                <div key={q.id} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <span>Câu {idx + 1}:</span> <span>{q.question_text}</span>
                  </div>
                  
                  {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {q.options.map((opt, oIdx) => {
                        const isStudentChoice = studentAnswer === oIdx;
                        const isCorrectOption = q.correct_option === oIdx;
                        let bg = 'var(--surface-2)', border = '1px solid var(--border)', color = 'inherit';
                        if (isCorrectOption) {
                          bg = 'var(--success)'; color = '#fff'; border = '1px solid var(--success)';
                        } else if (isStudentChoice) {
                          bg = 'var(--danger)'; color = '#fff'; border = '1px solid var(--danger)';
                        }
                        
                        return (
                          <div key={oIdx} style={{
                            padding: '0.75rem 1rem', borderRadius: '8px',
                            background: bg, color, border, display: 'flex', alignItems: 'center', gap: '0.75rem'
                          }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700
                            }}>{optionLabels[oIdx]}</div>
                            <span>{opt}</span>
                            {isStudentChoice && isCorrectOption && <CheckCircle2 size={16} style={{ marginLeft: 'auto' }} />}
                            {isStudentChoice && !isCorrectOption && <AlertCircle size={16} style={{ marginLeft: 'auto' }} />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.question_type === 'fill_blank' && (
                    <div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Đáp án của bạn: </strong>
                        <span style={{ color: studentAnswer === q.correct_answer ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                          {studentAnswer || '(Trống)'}
                        </span>
                      </div>
                      <div style={{ color: 'var(--success)' }}>
                        <strong>Đáp án đúng: </strong> {q.correct_answer}
                      </div>
                    </div>
                  )}

                  {q.question_type === 'essay' && (
                    <div>
                      <div style={{ marginBottom: '0.5rem' }}><strong>Bài làm:</strong></div>
                      <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                        {studentAnswer || '(Không có câu trả lời)'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {submittedResult && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem', border: '2px solid var(--success)' }}>
          <h2 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Đã nộp bài thành công!</h2>
          {submittedResult.score !== undefined && (
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{submittedResult.score} / {assignment.total_points} điểm</div>
          )}
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setSubmittedResult(null)}>Xem lại chi tiết</button>
        </div>
      )}

      {isQuiz && !takingQuiz && !submittedResult && !reviewingSub && user.role === 'student' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          {questions.length === 0 ? (
            <div className="alert alert-warning">Bài quiz này chưa có câu hỏi nào. Vui lòng quay lại sau!</div>
          ) : canTakeQuiz ? (
            <button className="btn btn-primary btn-lg" onClick={startQuiz}>
              <Play size={20} /> Bắt đầu làm bài
            </button>
          ) : (
            <div className="alert alert-error">Bạn đã hết số lần làm bài hoặc bài đã quá hạn!</div>
          )}
        </div>
      )}

      {isQuiz && takingQuiz && user.role === 'student' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 64, background: 'var(--surface)', padding: '1rem', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: timeLeft < 60 ? 'var(--danger)' : 'var(--primary)' }}>
                {timeLeft !== null && <><Clock size={18} style={{ display:'inline' }}/> {formatTime(timeLeft)}</>}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Đã trả lời: {Object.keys(answers).length} / {questions.length}
              </div>
            </div>
            <button className="btn btn-success" onClick={handleSubmit} disabled={submitting}>
              Nộp bài ngay
            </button>
          </div>

          <div style={{ marginTop: '2rem' }}>
            {/* Quick Navigation */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveQIdx(i)}
                  style={{
                    width: 36, height: 36, borderRadius: '4px', border: '1px solid var(--border)',
                    background: answers[q.id] !== undefined ? 'var(--success)' : activeQIdx === i ? 'var(--primary)' : 'var(--surface)',
                    color: answers[q.id] !== undefined || activeQIdx === i ? '#fff' : 'var(--text)',
                    fontWeight: 600, cursor: 'pointer'
                  }}
                >{i + 1}</button>
              ))}
            </div>

            {/* Active Question */}
            {questions[activeQIdx] && (() => {
              const q = questions[activeQIdx];
              return (
                <div className="card" style={{ padding: '2rem' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                    Câu {activeQIdx + 1}: {q.question_text} <span className="badge badge-ghost">({q.points}đ)</span>
                  </h4>

                  {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {q.options.map((opt, oIdx) => {
                        const isChosen = answers[q.id] === oIdx;
                        return (
                          <label key={oIdx} style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '1rem', borderRadius: '8px', cursor: 'pointer',
                            background: isChosen ? 'var(--primary-light)' : 'var(--surface-2)',
                            border: isChosen ? '1px solid var(--primary)' : '1px solid var(--border)',
                          }}>
                            <input type="radio" checked={isChosen} onChange={() => handleAnswerChange(q.id, oIdx)} style={{ display: 'none' }} />
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', background: isChosen ? 'var(--primary)' : '#cbd5e1',
                              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                            }}>{optionLabels[oIdx]}</div>
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.question_type === 'fill_blank' && (
                    <input 
                      type="text" className="form-input" placeholder="Nhập đáp án..."
                      value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)}
                    />
                  )}

                  {q.question_type === 'essay' && (
                    <textarea 
                      className="form-textarea" rows={5} placeholder="Nhập câu trả lời..."
                      value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)}
                    />
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                    <button className="btn btn-ghost" disabled={activeQIdx === 0} onClick={() => setActiveQIdx(activeQIdx - 1)}>Câu trước</button>
                    {activeQIdx < questions.length - 1 ? (
                      <button className="btn btn-primary" onClick={() => setActiveQIdx(activeQIdx + 1)}>Câu tiếp</button>
                    ) : (
                      <button className="btn btn-success" onClick={handleSubmit}>Nộp bài</button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Essay submission for student */}
      {!isQuiz && user.role === 'student' && !reviewingSub && (!assignment.my_submission || assignment.allow_resubmit) && !isPastDue && (
        <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Nộp bài tự luận</h3>
          <div className="form-group">
            <label className="form-label">Nội dung</label>
            <textarea className="form-textarea" rows={6} value={content} onChange={e => setContent(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">File đính kèm (tùy chọn)</label>
            <input type="file" className="form-input" onChange={e => setFile(e.target.files[0])} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Đang nộp...' : 'Nộp bài'}
          </button>
        </form>
      )}
    </div>
  );
};

export default AssignmentViewer;
