import React, { useCallback, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { canManageCourse } from '../routing/access';
import { 
  ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, FileText, 
  Video, Link2, X, Plus 
} from 'lucide-react';

// --- Utils ---
const getStartOfWeek = (d) => {
  const date = new Date(d);
  const day = date.getDay() || 7; 
  if (day !== 1) date.setHours(-24 * (day - 1));
  date.setHours(0,0,0,0);
  return date;
};

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 -> 21:00

const Timetable = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);

  // Filters & State
  const [view, setView] = useState('week'); // 'week' allows best timetable
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Custom Filter State
  const [selectedCourses, setSelectedCourses] = useState({});
  const [selectedTypes, setSelectedTypes] = useState({
    lecture: true, livestream: true, deadline: true, other: true
  });

  // Popup
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    course_id: '', title: '', start_time: '', end_time: '', event_type: 'lecture', meeting_link: ''
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    // Ideally pass dates to filter, for now let's just get all
    const startOfWeek = getStartOfWeek(currentDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    try {
      const res = await api.get('/events', { 
        params: { startDetail: startOfWeek.toISOString(), endDetail: endOfWeek.toISOString() }
      });
      setEvents(res.data);
      
      // Auto-extract distinct courses for the filter if student (since we only fetch active ones)
      if (user?.role === 'student') {
        const uniqueCourses = [...new Set(res.data.map(e => e.course_id))];
        const stateMapping = {};
        uniqueCourses.forEach(id => stateMapping[id] = true);
        setSelectedCourses(previous => Object.keys(previous).length === 0 ? stateMapping : previous);
      }
    } catch(err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [currentDate, user?.role]);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await api.get('/courses');
      const myCourses = res.data.filter(c => canManageCourse(user, c));
      setCourses(myCourses);
      const map = {};
      myCourses.forEach(c => map[c.id] = true);
      setSelectedCourses(previous => Object.keys(previous).length === 0 ? map : previous);
      if (myCourses.length > 0) {
        setNewEvent(previous => previous.course_id ? previous : { ...previous, course_id: myCourses[0].id });
      }
    } catch (error) {
      console.error('Không thể tải khóa học cho thời khóa biểu', error);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
    if (user?.role === 'lecturer' || user?.role === 'admin') fetchCourses();
  }, [fetchCourses, fetchEvents, user?.role]);

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };
  
  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const today = () => setCurrentDate(new Date());

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/events', newEvent);
      setShowCreateModal(false);
      fetchEvents();
    } catch {
      alert('Tạo sự kiện thất bại');
    }
  };

  // --- Render Week View Logic ---
  const startOfWeek = getStartOfWeek(currentDate);
  const datesOfWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Filter 
  const displayEvents = events.filter(ev => {
    if (!selectedTypes[ev.event_type]) return false;
    if (selectedCourses[ev.course_id] === false) return false; // Note: may be undefined, so explicitly check false
    return true;
  });

  const getEventStyle = (ev, index) => {
    const st = new Date(ev.start_time);
    const et = new Date(ev.end_time);
    
    // Find column (0-6)
    let dayIdx = st.getDay() - 1;
    if (dayIdx === -1) dayIdx = 6; // Sunday
    
    // Calculate vertical position (Hours 7 to 22 = 15 hours total space)
    const startHour = st.getHours() + (st.getMinutes() / 60);
    const endHour = et.getHours() + (et.getMinutes() / 60);

    const offsetHour = Math.max(0, startHour - 7); // relative to 7:00
    const durationObj = endHour - startHour;
    const duration = durationObj > 0 ? durationObj : 1; // min 1 hour block for deadlines
    
    // CSS Grid uses row/column lines. 
    // Wait, absolute positioning is easier inside the column. Let's return % absolute from top of column.
    
    const topPercentage = (offsetHour / 15) * 100;
    const heightPercentage = (duration / 15) * 100;

    let bg = 'var(--primary)';
    if (ev.event_type === 'deadline') bg = 'var(--error)';
    else if (ev.event_type === 'livestream') bg = 'var(--warning)';

    return {
      position: 'absolute',
      top: `${topPercentage}%`,
      height: `${heightPercentage}%`,
      left: '2px', right: '2px',
      background: bg,
      color: '#fff',
      padding: '4px 6px',
      borderRadius: '4px',
      fontSize: '0.8rem',
      overflow: 'hidden',
      cursor: 'pointer',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      zIndex: 10 + index
    };
  };

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)', padding: '1.5rem', minWidth: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Lịch Học & Sự Kiện</h1>
          <p style={{ color: 'var(--text-muted)' }}>Quản lý thời gian, xem deadline và tham gia buổi học</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user?.role !== 'student' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> Tạo Lịch
            </button>
          )}
          <div className="btn-group" style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '4px' }}>
            <button className="btn btn-ghost btn-sm" onClick={today}>Hôm nay</button>
            <div style={{ display: 'flex', gap: '2px', marginLeft: 8 }}>
              <button className="btn btn-secondary btn-sm" style={{ padding: '0 8px' }} onClick={prevWeek}><ChevronLeft size={16} /></button>
              <button className="btn btn-secondary btn-sm" style={{ padding: '0 8px' }} onClick={nextWeek}><ChevronRight size={16} /></button>
            </div>
          </div>
          <select className="form-select" style={{ width: 120, padding: '0.4rem 0.5rem' }} value={view} onChange={(e) => setView(e.target.value)}>
            <option value="week">Tuần</option>
            <option value="month">Tháng</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div className="card" style={{ width: '250px', pflexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Theo Môn Học</h3>
            {user?.role === 'student' ? (
               displayEvents.length === 0 && !loading && ( <div style={{ fontSize:'0.85rem', color: 'var(--text-muted)', marginTop:8 }}>Không có môn nào trong tuần này</div> )
            ) : (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {courses.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedCourses[c.id] !== false} onChange={(e) => setSelectedCourses({...selectedCourses, [c.id]: e.target.checked})} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace:'nowrap' }}>{c.title}</span>
                  </label>
                ))}
              </div>
            )}
            
            {/* Minimal Student Course Filter based on fetched events */}
            {user?.role === 'student' && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 {[...new Set(events.map(e => ({id: e.course_id, title: e.course_title})))].filter((v,i,a) => a.findIndex(t => t.id === v.id)===i).map(c => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedCourses[c.id] !== false} onChange={(e) => setSelectedCourses({...selectedCourses, [c.id]: e.target.checked})} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace:'nowrap' }}>{c.title}</span>
                    </label>
                 ))}
              </div>
            )}
          </div>

          <div style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Loại Sự Kiện</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedTypes.lecture} onChange={(e) => setSelectedTypes({...selectedTypes, lecture: e.target.checked})} />
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>■</span> Bài giảng (Lecture)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedTypes.livestream} onChange={(e) => setSelectedTypes({...selectedTypes, livestream: e.target.checked})} />
                <span style={{ color: 'var(--warning)', fontWeight: 600 }}>■</span> Livestream
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedTypes.deadline} onChange={(e) => setSelectedTypes({...selectedTypes, deadline: e.target.checked})} />
                <span style={{ color: 'var(--error)', fontWeight: 600 }}>■</span> Bài tập / Deadline
              </label>
            </div>
          </div>
        </div>

        {/* Main Calendar Grid */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', flexShrink: 0 }}>
            <div style={{ padding: '0.75rem', textAlign: 'center', borderRight: '1px solid var(--border)' }}>TZ</div>
            {datesOfWeek.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <div key={i} style={{ padding: '0.75rem', textAlign: 'center', borderRight: i<6 ? '1px solid var(--border)' : 'none', background: isToday ? 'var(--primary-light)' : 'transparent' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{DAYS[i]}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--primary)' : 'var(--text)' }}>{d.getDate()}/{d.getMonth()+1}</div>
                </div>
              );
            })}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', position: 'relative', minHeight: `${HOURS.length * 60}px` }}>
              
              {/* Hours Ruler */}
              <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
                {HOURS.map(h => (
                  <div key={h} style={{ height: '60px', paddingRight: '8px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                    <span style={{ position: 'relative', top: '-10px' }}>{h}:00</span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {datesOfWeek.map((d, colIndex) => {
                // Filter events for this specific day
                const dayEvents = displayEvents.filter(ev => {
                  const st = new Date(ev.start_time);
                  return st.getDate() === d.getDate() && st.getMonth() === d.getMonth() && st.getFullYear() === d.getFullYear();
                });

                return (
                  <div key={colIndex} style={{ position: 'relative', borderRight: colIndex<6 ? '1px solid var(--border)' : 'none' }}>
                    
                    {/* Background Hour Lines */}
                    {HOURS.map(h => (
                      <div key={h} style={{ height: '60px', borderBottom: '1px solid var(--border)' }} />
                    ))}

                    {/* Events absolute positioning */}
                    {dayEvents.map((ev, idx) => (
                      <div key={ev.id} onClick={() => setSelectedEvent(ev)} style={getEventStyle(ev, idx)}>
                         <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.course_title}</div>
                         <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                         <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                           {new Date(ev.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </div>
                      </div>
                    ))}
                  </div>
                );
              })}

            </div>
          </div>
        </div>

      </div>

      {/* Detail Popup Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Chi tiết sự kiện</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedEvent(null)}><X size={18} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{selectedEvent.title}</h4>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <CalIcon size={16} /> 
                {new Date(selectedEvent.start_time).toLocaleString()}
              </p>
              
              <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '8px', fontWeight: 700 }}>Thuộc khóa học:</div>
                <div style={{ color: 'var(--primary)' }}>{selectedEvent.course_title}</div>
              </div>

              {selectedEvent.meeting_link && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <Link2 size={16} /> <a href={selectedEvent.meeting_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>Tham gia lớp học Online (Meet/Zoom)</a>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                {selectedEvent.id && selectedEvent.id.toString().startsWith('assignment') ? (
                  <button className="btn btn-primary btn-block" onClick={() => navigate(`/courses/${selectedEvent.course_id}/learn`)}>Nộp bài tập</button>
                ) : (
                  <button className="btn btn-secondary btn-block" onClick={() => navigate(`/courses/${selectedEvent.course_id}`)}>Vào Khóa Học</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Lên lịch mới</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Tên sự kiện</label>
                  <input type="text" className="form-input" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Vd: Buổi chữa bài trực tuyến" />
                </div>
                <div className="form-group">
                  <label className="form-label">Chọn khóa học</label>
                  <select className="form-select" required value={newEvent.course_id} onChange={e => setNewEvent({...newEvent, course_id: e.target.value})}>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Loại</label>
                    <select className="form-select" value={newEvent.event_type} onChange={e => setNewEvent({...newEvent, event_type: e.target.value})}>
                      <option value="lecture">Bình thường</option>
                      <option value="livestream">Trực tuyến / Livestream</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Link Meet/Zoom (Nếu có)</label>
                    <input type="text" className="form-input" value={newEvent.meeting_link} onChange={e => setNewEvent({...newEvent, meeting_link: e.target.value})} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Thời gian bắt đầu</label>
                    <input type="datetime-local" className="form-input" required value={newEvent.start_time} onChange={e => setNewEvent({...newEvent, start_time: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Thời gian kết thúc</label>
                    <input type="datetime-local" className="form-input" required value={newEvent.end_time} onChange={e => setNewEvent({...newEvent, end_time: e.target.value})} />
                  </div>
                </div>
              </div>
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu Lịch</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Timetable;
