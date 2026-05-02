import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => 
    apiClient.post('/auth/login', { email, password }),
};

// Risk API
export const riskAPI = {
  scoreStudent: (studentId) => 
    apiClient.post('/api/risk/score', { student_id: studentId }),
};

// Portfolio API
export const portfolioAPI = {
  getHeatmap: (params) => 
    apiClient.get('/api/portfolio/heatmap', { params }),
  getAlerts: (params) => 
    apiClient.get('/api/portfolio/alerts', { params }),
  getStats: (params) => 
    apiClient.get('/api/portfolio/stats', { params }),
};

// Student API
export const studentAPI = {
  getProfile: (studentId) => 
    apiClient.get(`/api/student/${studentId}`),
  getHistory: (studentId, limit = 10) => 
    apiClient.get(`/api/student/${studentId}/history`, { params: { limit } }),
  initiateAction: (studentId, actionType) => 
    apiClient.post(`/api/student/${studentId}/action`, { action_type: actionType }),
};

export default apiClient;
