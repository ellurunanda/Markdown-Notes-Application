import { useState, useCallback } from 'react';
import { notesAPI } from '../services/api';
import toast from 'react-hot-toast';

/**
 * Central hook for notes state management.
 * Handles CRUD, search, tag filtering, and pagination.
 */
export function useNotes() {
  const [notes, setNotes] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [activeNote, setActiveNote] = useState(null);

  const fetchNotes = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await notesAPI.list(params);
      setNotes(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error('Failed to load notes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createNote = useCallback(async (data = {}) => {
    try {
      const res = await notesAPI.create({ title: 'Untitled Note', content: '', ...data });
      const newNote = res.data.data;
      setNotes((prev) => [newNote, ...prev]);
      setActiveNote(newNote);
      return newNote;
    } catch (err) {
      toast.error('Failed to create note.');
      throw err;
    }
  }, []);

  const updateNote = useCallback(async (id, data) => {
    try {
      const res = await notesAPI.update(id, data);
      const updated = res.data.data;
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setActiveNote((prev) => (prev?.id === id ? updated : prev));
      return updated;
    } catch (err) {
      toast.error('Failed to save note.');
      throw err;
    }
  }, []);

  const deleteNote = useCallback(async (id) => {
    try {
      await notesAPI.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setActiveNote((prev) => (prev?.id === id ? null : prev));
      toast.success('Note deleted.');
    } catch (err) {
      toast.error('Failed to delete note.');
      throw err;
    }
  }, []);

  return {
    notes,
    meta,
    loading,
    activeNote,
    setActiveNote,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
  };
}