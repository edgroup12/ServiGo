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
    } catch (e) {
      // Corrupted localStorage, ignore
    }
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with an error status
      console.error(`API ${error.response.status}:`, error.response.data);
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
