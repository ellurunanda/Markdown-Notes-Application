import React, { useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useNotes } from './hooks/useNotes';
import AuthPage from './components/Auth/AuthPage';
import Sidebar from './components/Sidebar/Sidebar';
import Editor from './components/Editor/Editor';
import { Toaster } from 'react-hot-toast';
import './styles/globals.css';
import './App.css';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const {
    notes,
    meta,
    loading,
    activeNote,
    setActiveNote,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  } = useNotes();

  // Fetch params state
  const [fetchParams, setFetchParams] = React.useState({});

  // Load notes on mount and when fetch params change
  useEffect(() => {
    if (user) fetchNotes(fetchParams);
  }, [user, fetchParams, fetchNotes]);

  const handleSearch = useCallback((query) => {
    setFetchParams((p) => ({ ...p, search: query || undefined, page: 1 }));
  }, []);

  const handleTagFilter = useCallback((tag) => {
    setFetchParams((p) => ({ ...p, tag: tag || undefined, page: 1 }));
  }, []);

  const handleSelectNote = useCallback(
    (note) => setActiveNote(note),
    [setActiveNote]
  );

  const handleCreateNote = useCallback(async () => {
    await createNote();
  }, [createNote]);

  const handleDeleteNote = useCallback(
    async (id) => {
      await deleteNote(id);
    },
    [deleteNote]
  );

  const handleUpdate = useCallback(
    (updated) => updateNote(updated.id, updated),
    [updateNote]
  );

  // Show loading spinner while verifying auth
  if (authLoading) {
    return (
      <div className="app-loading">
        <span
          className="spin"
          style={{
            display: 'inline-block',
            width: 32,
            height: 32,
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <div className="app-layout">
      <Sidebar
        notes={notes}
        activeNote={activeNote}
        loading={loading}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onSearch={handleSearch}
        onTagFilter={handleTagFilter}
      />
      <main className="app-main">
        <Editor note={activeNote} onUpdate={handleUpdate} />
      </main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.875rem',
          },
        }}
      />
    </div>
  );
}