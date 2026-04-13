import axios from "axios";

const BASE_URL =
  process.env.REACT_APP_API_URL ||
  "https://markdown-notes-app-backend.onrender.com";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear auth and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

// ── Notes ─────────────────────────────────────────────────────────────────────

export const notesAPI = {
  list: (params = {}) => api.get("/notes", { params }),
  get: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post("/notes", data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
  listVersions: (id) => api.get(`/notes/${id}/versions`),
  restoreVersion: (noteId, versionId) =>
    api.post(`/notes/${noteId}/versions/${versionId}/restore`),
};

// ── Tags ──────────────────────────────────────────────────────────────────────

export const tagsAPI = {
  list: () => api.get("/notes/tags"),
};

export default api;
