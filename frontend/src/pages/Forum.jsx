import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { MessageSquare, Users, Eye, Plus, ArrowLeft } from 'lucide-react';

const Forum = () => {
  const { user } = useContext(AuthContext);
  const [topics, setTopics] = useState([]);
  const [activeTopic, setActiveTopic] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', content: '' });
  const [replyContent, setReplyContent] = useState('');

  const fetchTopics = async () => {
    try {
      const res = await api.get('/interactions/forums');
      setTopics(res.data);
    } catch (error) {
      console.error('Failed to load forum topics', error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    api.get('/interactions/forums')
      .then((res) => {
        if (!cancelled) setTopics(res.data);
      })
      .catch((error) => console.error('Failed to load forum topics', error));
    return () => { cancelled = true; };
  }, []);

  const loadTopic = async (id) => {
    try {
      const res = await api.get(`/interactions/forums/${id}`);
      setActiveTopic(res.data);
    } catch (error) {
      console.error('Failed to load forum topic', error);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    try {
      await api.post('/interactions/forums', newTopic);
      setShowAddModal(false);
      setNewTopic({ title: '', content: '' });
      fetchTopics();
    } catch {
      alert('Failed to create topic');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    try {
      await api.post(`/interactions/forums/${activeTopic.id}/reply`, { content: replyContent });
      setReplyContent('');
      loadTopic(activeTopic.id); // reload replies
    } catch {
      alert('Failed to reply');
    }
  };

  return (
    <div className="container" style={{ maxWidth: 800, margin: '2rem auto' }}>
      {!activeTopic ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Community Forum</h1>
              <p style={{ color: 'var(--text-muted)' }}>Discuss course topics and ask questions.</p>
            </div>
            {user && (
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={16} /> New Topic
              </button>
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {topics.map(t => (
              <div key={t.id} onClick={() => loadTopic(t.id)}
                style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-alt)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4, color: 'var(--primary)' }}>{t.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Posted by {t.author_name} {t.course_title && <span className="badge badge-secondary" style={{ marginLeft: 6 }}>{t.course_title}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><MessageSquare size={14}/> {t.reply_count}</div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><Eye size={14}/> {t.views}</div>
                </div>
              </div>
            ))}
            {topics.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No topics available. Be the first to start a conversation!</div>}
          </div>
        </>
      ) : (
        <>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }} onClick={() => { setActiveTopic(null); fetchTopics(); }}>
            <ArrowLeft size={15} /> Back to Forum
          </button>
          
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>{activeTopic.title}</h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Posted by <span style={{ fontWeight: 600 }}>{activeTopic.author_name}</span> on {new Date(activeTopic.created_at).toLocaleString()}
            </div>
            <div style={{ fontSize: '1rem', lineHeight: 1.6 }}>{activeTopic.content}</div>
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Replies ({activeTopic.replies?.length || 0})</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {activeTopic.replies?.map(r => (
              <div key={r.id} className="card" style={{ padding: '1rem', background: 'var(--bg-alt)', border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.reply_author} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({r.reply_role})</span></span>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '0.95rem' }}>{r.content}</div>
              </div>
            ))}
          </div>

          {user ? (
            <form onSubmit={handleReply} style={{ marginTop: '1rem' }}>
              <textarea className="form-textarea" rows="4" required placeholder="Write a reply..."
                value={replyContent} onChange={e => setReplyContent(e.target.value)} />
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Post Reply</button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Please log in to reply.</div>
          )}
        </>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Topic</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTopic}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Topic Title *</label>
                  <input type="text" className="form-input" required
                    value={newTopic.title} onChange={e => setNewTopic({ ...newTopic, title: e.target.value })}
                    placeholder="What is this discussion about?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Content *</label>
                  <textarea className="form-textarea" rows="5" required
                    value={newTopic.content} onChange={e => setNewTopic({ ...newTopic, content: e.target.value })}
                    placeholder="Provide details..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Topic</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forum;
