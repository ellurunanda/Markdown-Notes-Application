import React, { useState, useEffect } from 'react';
import { notesAPI } from '../../services/api';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './VersionHistory.css';

export default function VersionHistory({ noteId, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    notesAPI
      .listVersions(noteId)
      .then((res) => {
        setVersions(res.data.data);
        if (res.data.data.length > 0) setSelected(res.data.data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [noteId]);

  const handleRestore = async () => {
    if (!selected) return;
    setRestoring(true);
    try {
      const res = await notesAPI.restoreVersion(noteId, selected.id);
      onRestore(res.data.data);
    } catch {
      // handled by parent
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="vh-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vh-modal fade-in">
        <div className="vh-header">
          <h2 className="vh-title">🕐 Version History</h2>
          <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading ? (
          <div className="vh-loading">Loading versions…</div>
        ) : versions.length === 0 ? (
          <div className="vh-empty">No saved versions yet. Versions are created automatically on each save.</div>
        ) : (
          <div className="vh-body">
            {/* Version list */}
            <div className="vh-list">
              {versions.map((v) => (
                <button
                  key={v.id}
                  className={`vh-item ${selected?.id === v.id ? 'vh-item--active' : ''}`}
                  onClick={() => setSelected(v)}
                >
                  <span className="vh-item-title">{v.title || 'Untitled'}</span>
                  <span className="vh-item-date">
                    {format(new Date(v.saved_at), 'MMM d, yyyy HH:mm')}
                  </span>
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className="vh-preview">
              {selected && (
                <>
                  <div className="vh-preview-header">
                    <strong>{selected.title}</strong>
                    <span className="vh-preview-date">
                      {format(new Date(selected.saved_at), 'MMMM d, yyyy — HH:mm:ss')}
                    </span>
                  </div>
                  <div className="markdown-preview vh-preview-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selected.content || '*Empty note*'}
                    </ReactMarkdown>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {versions.length > 0 && (
          <div className="vh-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleRestore}
              disabled={!selected || restoring}
            >
              {restoring ? 'Restoring…' : 'Restore This Version'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}