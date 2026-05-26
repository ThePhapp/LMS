import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Search, RefreshCw, Trash2, Users, FileText, Tag, AlertTriangle, X, ChevronDown, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api, { assetUrl } from '../services/api';

const LEVEL_CONFIG = {
  'Beginner':     { label: 'Cơ bản',    bg: '#D1FAE5', color: '#059669', border: '#6EE7B7' },
  'Intermediate': { label: 'Trung cấp', bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' },
  'Advanced':     { label: 'Nâng cao',  bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' },
};

const CATEGORY_COLORS = {
  'Science':  { bg: '#DBEAFE', color: '#2563EB' },
  'Language': { bg: '#EDE9FE', color: '#7C3AED' },
  'Arts':     { bg: '#FCE7F3', color: '#DB2777' },
  'Math':     { bg: '#FEF9C3', color: '#CA8A04' },
  'General':  { bg: '#F1F5F9', color: '#64748B' },
};

const DeleteModal = ({ course, onConfirm, onCancel, loading }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  }}>
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        width: '100%', maxWidth: 420, padding: '2rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AlertTriangle size={22} color="#DC2626" />
        </div>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0F172A' }}>Xoá khoá học</h3>
          <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: 2 }}>Hành động này không thể hoàn tác.</p>
        </div>
      </div>
      <p style={{ color: '#334155', fontSize: '0.9rem', background: '#F8FAFC', borderRadius: 10, padding: '0.75rem 1rem', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
        Bạn có chắc muốn xoá khoá học <strong>"{course?.title}"</strong>? Tất cả bài học, chương và dữ liệu liên quan sẽ bị xoá vĩnh viễn.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          disabled={loading}
          style={{ padding: '0.55rem 1.25rem', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.15s' }}
        >
          Huỷ bỏ
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          style={{
            padding: '0.55rem 1.25rem', borderRadius: 10, border: 'none',
            background: loading ? '#FCA5A5' : '#EF4444', color: '#fff',
            fontWeight: 700, fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
          }}
        >
          {loading ? <RefreshCw size={15} style={{ animation: 'spin .6s linear infinite' }} /> : <Trash2 size={15} />}
          {loading ? 'Đang xoá...' : 'Xoá khoá học'}
        </button>
      </div>
    </motion.div>
  </div>
);

const AdminCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/courses');
      setCourses(res.data);
      setFiltered(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách khoá học.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  useEffect(() => {
    let result = courses;
    if (categoryFilter !== 'all') result = result.filter(c => c.category === categoryFilter);
    if (levelFilter !== 'all') result = result.filter(c => c.level === levelFilter);
    if (search) result = result.filter(c =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.lecturer_name.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(result);
  }, [search, categoryFilter, levelFilter, courses]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/courses/${deleteTarget.id}`);
      setCourses(prev => prev.filter(c => c.id !== deleteTarget.id));
      showToast(`Đã xoá khoá học "${deleteTarget.title}" thành công.`);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Xoá thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const categories = ['all', ...new Set(courses.map(c => c.category))];
  const levels = ['all', 'Beginner', 'Intermediate', 'Advanced'];

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: 20, right: 20, zIndex: 200,
              background: toast.type === 'error' ? '#FEE2E2' : '#D1FAE5',
              border: `1px solid ${toast.type === 'error' ? '#FCA5A5' : '#6EE7B7'}`,
              color: toast.type === 'error' ? '#DC2626' : '#059669',
              padding: '0.75rem 1.25rem', borderRadius: 12,
              fontWeight: 600, fontSize: '0.875rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            {toast.type === 'error' ? <AlertTriangle size={16} /> : '✓'} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            course={deleteTarget}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Quản lý Khoá học
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
          Xem, tìm kiếm và xoá các khoá học trong hệ thống
        </p>
      </div>

      {/* Summary Strip */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Tổng khoá học', value: courses.length, icon: <BookOpen size={16} color="#6366F1" />, bg: '#EEF2FF', color: '#6366F1' },
          { label: 'Khoá học đang hiển thị', value: filtered.length, icon: <Eye size={16} color="#8B5CF6" />, bg: '#EDE9FE', color: '#8B5CF6' },
          { label: 'Tổng học viên đăng ký', value: courses.reduce((s, c) => s + Number(c.student_count || 0), 0), icon: <Users size={16} color="#06B6D4" />, bg: '#CFFAFE', color: '#06B6D4' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
            padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Tìm tên khoá học, giảng viên..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.45rem 0.875rem 0.45rem 2.2rem',
                border: '1.5px solid #E2E8F0', borderRadius: 999,
                fontSize: '0.85rem', fontFamily: 'inherit', color: '#0F172A',
                outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#6366F1'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            />
          </div>

          {/* Category filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{
                padding: '0.45rem 2rem 0.45rem 0.875rem', border: '1.5px solid #E2E8F0',
                borderRadius: 999, fontSize: '0.82rem', fontFamily: 'inherit', color: '#334155',
                background: '#fff', cursor: 'pointer', appearance: 'none', outline: 'none',
              }}
            >
              <option value="all">Tất cả danh mục</option>
              {categories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
          </div>

          {/* Level filter */}
          <div style={{ position: 'relative' }}>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              style={{
                padding: '0.45rem 2rem 0.45rem 0.875rem', border: '1.5px solid #E2E8F0',
                borderRadius: 999, fontSize: '0.82rem', fontFamily: 'inherit', color: '#334155',
                background: '#fff', cursor: 'pointer', appearance: 'none', outline: 'none',
              }}
            >
              {levels.map(l => <option key={l} value={l}>{l === 'all' ? 'Tất cả cấp độ' : (LEVEL_CONFIG[l]?.label || l)}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchCourses}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #E2E8F0',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = '#6366F1'; e.currentTarget.style.color = '#6366F1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; }}
            title="Làm mới"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748B' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '0.9rem' }}>Đang tải danh sách khoá học...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem' }}>
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '1rem 1.25rem', borderRadius: 10, borderLeft: '4px solid #EF4444' }}>
              {error}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['#', 'Khoá học', 'Giảng viên', 'Danh mục', 'Cấp độ', 'Học viên', 'Bài học', 'Thao tác'].map(col => (
                    <th key={col} style={{
                      padding: '0.875rem 1rem', textAlign: col === 'Thao tác' ? 'center' : 'left',
                      fontSize: '0.7rem', fontWeight: 700, color: '#64748B',
                      textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((course, idx) => {
                  const lvlCfg = LEVEL_CONFIG[course.level] || LEVEL_CONFIG['Beginner'];
                  const catCfg = CATEGORY_COLORS[course.category] || CATEGORY_COLORS['General'];
                  return (
                    <motion.tr
                      key={course.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.875rem 1rem', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, width: 40 }}>{idx + 1}</td>
                      <td style={{ padding: '0.875rem 1rem', maxWidth: 280 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(99,102,241,0.2)',
                          }}>
                            {course.thumbnail_url
                              ? <img src={assetUrl(course.thumbnail_url)} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <BookOpen size={18} color="rgba(255,255,255,0.8)" />
                            }
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                              {course.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>
                              {course.price > 0 ? `${Number(course.price).toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#334155', fontSize: '0.875rem' }}>
                        {course.lecturer_name}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: catCfg.bg, color: catCfg.color }}>
                          <Tag size={10} />
                          {course.category}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: lvlCfg.bg, color: lvlCfg.color, border: `1px solid ${lvlCfg.border}` }}>
                          {lvlCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#334155', fontSize: '0.875rem' }}>
                          <Users size={14} color="#64748B" />
                          {course.student_count}
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#334155', fontSize: '0.875rem' }}>
                          <FileText size={14} color="#64748B" />
                          {course.lesson_count}
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => navigate(`/courses/${course.id}`)}
                            style={{
                              padding: '0.35rem 0.7rem', borderRadius: 8, border: '1.5px solid #E2E8F0',
                              background: '#fff', color: '#6366F1', fontSize: '0.78rem', fontWeight: 600,
                              cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = '#6366F1'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                            title="Xem khoá học"
                          >
                            <Eye size={13} /> Xem
                          </button>
                          <button
                            onClick={() => setDeleteTarget(course)}
                            style={{
                              padding: '0.35rem 0.7rem', borderRadius: 8, border: '1.5px solid #FCA5A5',
                              background: '#FFF5F5', color: '#DC2626', fontSize: '0.78rem', fontWeight: 600,
                              cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#FFF5F5'; }}
                            title="Xoá khoá học"
                          >
                            <Trash2 size={13} /> Xoá
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} style={{ padding: '4rem', textAlign: 'center', color: '#94A3B8' }}>
                      <BookOpen size={40} style={{ margin: '0 auto 1rem', opacity: 0.3, display: 'block' }} />
                      Không tìm thấy khoá học nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCourses;
