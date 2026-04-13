import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { notesAPI } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import VersionHistory from '../VersionHistory/VersionHistory';
import TagEditor from '../TagEditor/TagEditor';
import toast from 'react-hot-toast';
import './Editor.css';

export default function Editor({ note, onUpdate }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving'
  const [showVersions, setShowVersions] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'editor' | 'preview'

  const debouncedTitle = useDebounce(title, 800);
  const debouncedContent = useDebounce(content, 800);

  // Track if this is the initial load (avoid auto-save on mount)
  const isInitialLoad = useRef(true);
  const noteIdRef = useRef(null);

  // Populate fields when active note changes
  useEffect(() => {
    if (note) {
      isInitialLoad.current = true;
      setTitle(note.title || '');
      setContent(note.content || '');
      setTags(note.tags?.map((t) => t.name) || []);
      setIsPinned(!!note.is_pinned);
      setSaveStatus('saved');
      noteIdRef.current = note.id;
      // Allow debounce to settle before enabling auto-save
      setTimeout(() => { isInitialLoad.current = false; }, 900);
    }
  }, [note?.id]);

  // Debounced auto-save
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!noteIdRef.current) return;
    setSaveStatus('unsaved');
  }, [title, content]);

  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!noteIdRef.current) return;
    autoSave();
  }, [debouncedTitle, debouncedContent]);

  const autoSave = useCallback(async () => {
    if (!noteIdRef.current) return;
    setSaving(true);
    setSaveStatus('saving');
    try {
      const updated = await notesAPI.update(noteIdRef.current, {
        title: title || 'Untitled Note',
        content,
        tags,
        is_pinned: isPinned,
      });
      onUpdate(updated.data.data);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('unsaved');
    } finally {
      setSaving(false);
    }
  }, [title, content, tags, isPinned, onUpdate]);

  const handleManualSave = async () => {
    await autoSave();
    toast.success('Note saved!');
  };

  const handlePinToggle = async () => {
    const next = !isPinned;
    setIsPinned(next);
    if (!noteIdRef.current) return;
    try {
      const updated = await notesAPI.update(noteIdRef.current, { is_pinned: next });
      onUpdate(updated.data.data);
    } catch {
      setIsPinned(!next);
    }
  };

  const handleTagsChange = async (newTags) => {
    setTags(newTags);
    if (!noteIdRef.current) return;
    try {
      const updated = await notesAPI.update(noteIdRef.current, { tags: newTags });
      onUpdate(updated.data.data);
    } catch {
      toast.error('Failed to update tags.');
    }
  };

  if (!note) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-content">
          <span className="editor-empty-icon">📝</span>
          <h2>Select a note or create a new one</h2>
          <p>Your notes will appear here with a live Markdown preview.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <input
            className="editor-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title…"
            aria-label="Note title"
          />
        </div>

        <div className="editor-toolbar-right">
          {/* Save status indicator */}
          <span className={`save-status save-status--${saveStatus}`}>
            {saveStatus === 'saving' && (
              <span className="spin save-spinner" />
            )}
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'unsaved' && '● Unsaved'}
            {saveStatus === 'saving' && 'Saving…'}
          </span>

          {/* View mode toggle */}
          <div className="view-toggle" role="group" aria-label="View mode">
            {[
              { key: 'editor', label: '✏️', title: 'Editor only' },
              { key: 'split', label: '⬛⬜', title: 'Split view' },
              { key: 'preview', label: '👁', title: 'Preview only' },
            ].map(({ key, label, title }) => (
              <button
                key={key}
                className={`view-toggle-btn ${viewMode === key ? 'view-toggle-btn--active' : ''}`}
                onClick={() => setViewMode(key)}
                title={title}
                aria-pressed={viewMode === key}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            className={`btn btn-ghost icon-btn ${isPinned ? 'pinned' : ''}`}
            onClick={handlePinToggle}
            title={isPinned ? 'Unpin note' : 'Pin note'}
          >
            📌
          </button>

          <button
            className="btn btn-ghost icon-btn"
            onClick={() => setShowVersions(true)}
            title="Version history"
          >
            🕐
          </button>

          <button
            className="btn btn-primary"
            onClick={handleManualSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="editor-tags-bar">
        <TagEditor tags={tags} onChange={handleTagsChange} />
      </div>

      {/* Split-screen panels */}
      <div className={`editor-panels editor-panels--${viewMode}`}>
        {/* Left: Raw Markdown editor */}
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div className="editor-panel editor-panel--write">
            <div className="panel-label">MARKDOWN</div>
            <textarea
              className="editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`# Start writing in Markdown\n\n**Bold**, *italic*, \`code\`, [links](url), and more…`}
              spellCheck
              aria-label="Markdown editor"
            />
          </div>
        )}

        {/* Divider */}
        {viewMode === 'split' && <div className="editor-divider" />}

        {/* Right: Rendered preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="editor-panel editor-panel--preview">
            <div className="panel-label">PREVIEW</div>
            <div className="markdown-preview">
              {content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {content}
                </ReactMarkdown>
              ) : (
                <p className="preview-placeholder">Preview will appear here as you type…</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Version History modal */}
      {showVersions && (
        <VersionHistory
          noteId={note.id}
          onRestore={(restored) => {
            onUpdate(restored);
            setTitle(restored.title);
            setContent(restored.content);
            setShowVersions(false);
            toast.success('Version restored!');
          }}
          onClose={() => setShowVersions(false)}
        />
      )}
    </div>
  );
}