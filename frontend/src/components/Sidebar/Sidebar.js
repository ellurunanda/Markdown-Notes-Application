import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useDebounce } from '../../hooks/useDebounce';
import { tagsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Sidebar.css';

export default function Sidebar({
  notes,
  activeNote,
  loading,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onSearch,
  onTagFilter,
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState('');
  const [tags, setTags] = useState([]);
  const [activeTag, setActiveTag] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    onSearch(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  useEffect(() => {
    tagsAPI.list().then((res) => setTags(res.data.data)).catch(() => {});
  }, [notes]);

  const handleTagClick = (tagName) => {
    const next = activeTag === tagName ? '' : tagName;
    setActiveTag(next);
    onTagFilter(next);
  };

  const handleDelete = (e, noteId) => {
    e.stopPropagation();
    if (confirmDelete === noteId) {
      onDeleteNote(noteId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(noteId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const truncate = (str, len = 80) =>
    str && str.length > len ? str.slice(0, len) + '…' : str;

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">📝</span>
          <span className="sidebar-brand-name">MarkNotes</span>
        </div>
        <div className="sidebar-header-actions">
          <button
            className="btn btn-ghost icon-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button
            className="btn btn-ghost icon-btn"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            🚪
          </button>
        </div>
      </div>

      {/* User info */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <span className="sidebar-user-name">{user?.username}</span>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <span className="sidebar-search-icon">🔍</span>
        <input
          type="search"
          className="sidebar-search-input"
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search notes"
        />
        {search && (
          <button
            className="sidebar-search-clear"
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tags filter */}
      {tags.length > 0 && (
        <div className="sidebar-tags">
          {tags.map((tag) => (
            <button
              key={tag.id}
              className={`tag-chip ${activeTag === tag.name ? 'tag-chip--active' : ''}`}
              style={{ '--tag-color': tag.color }}
              onClick={() => handleTagClick(tag.name)}
            >
              {tag.name}
              <span className="tag-chip-count">{tag.note_count}</span>
            </button>
          ))}
        </div>
      )}

      {/* New Note button */}
      <button className="btn btn-primary sidebar-new-btn" onClick={onCreateNote}>
        <span>＋</span> New Note
      </button>

      {/* Notes list */}
      <div className="sidebar-notes">
        {loading && (
          <div className="sidebar-empty">
            <span className="spin" style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="sidebar-empty">
            <p>{search ? 'No notes match your search.' : 'No notes yet. Create one!'}</p>
          </div>
        )}

        {!loading && notes.map((note) => (
          <div
            key={note.id}
            className={`note-item ${activeNote?.id === note.id ? 'note-item--active' : ''}`}
            onClick={() => onSelectNote(note)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectNote(note)}
          >
            <div className="note-item-header">
              <span className="note-item-pin">{note.is_pinned ? '📌' : ''}</span>
              <span className="note-item-title">{note.title || 'Untitled Note'}</span>
              <button
                className={`btn note-item-delete ${confirmDelete === note.id ? 'note-item-delete--confirm' : ''}`}
                onClick={(e) => handleDelete(e, note.id)}
                title={confirmDelete === note.id ? 'Click again to confirm' : 'Delete note'}
                aria-label="Delete note"
              >
                {confirmDelete === note.id ? '⚠️' : '🗑'}
              </button>
            </div>

            <p className="note-item-preview">
              {truncate(note.content?.replace(/[#*`>\-_\[\]]/g, '').trim())}
            </p>

            <div className="note-item-footer">
              <span className="note-item-date">
                {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
              </span>
              {note.tags?.length > 0 && (
                <div className="note-item-tags">
                  {note.tags.slice(0, 2).map((t) => (
                    <span key={t.id} className="note-item-tag" style={{ '--tag-color': t.color }}>
                      {t.name}
                    </span>
                  ))}
                  {note.tags.length > 2 && (
                    <span className="note-item-tag">+{note.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}