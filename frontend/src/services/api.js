import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const user = localStorage.getItem('servigo_user');
  if (user) {
    try {
      const { token } = JSON.parse(user);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Corrupted localStorage, ignore
    }
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor — handles errors and auto-redirects on auth failure
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      console.error(`API ${status}:`, error.response.data);

      // Auto-redirect to login on 401 (expired/invalid token)
      if (status === 401) {
        localStorage.removeItem('servigo_user');
        // Only redirect if not already on an auth page to avoid redirect loops
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login';
        }
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error("Network error - no response received:", error.message);
    } else {
      console.error("Request setup error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
