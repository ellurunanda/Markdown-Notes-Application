import React, { useState, useRef } from 'react';
import './TagEditor.css';

const TAG_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
];

function randomColor() {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

export default function TagEditor({ tags = [], onChange }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const addTag = (value) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed)) {
      setInput('');
      return;
    }
    onChange([...tags, trimmed]);
    setInput('');
  };

  const removeTag = (tag) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="tag-editor" onClick={() => inputRef.current?.focus()}>
      <span className="tag-editor-label">🏷</span>
      {tags.map((tag) => (
        <span key={tag} className="tag-badge" style={{ '--tag-color': randomColor() }}>
          {tag}
          <button
            type="button"
            className="tag-badge-remove"
            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="tag-editor-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length === 0 ? 'Add tags (press Enter or comma)…' : ''}
        aria-label="Add tag"
      />
    </div>
  );
}