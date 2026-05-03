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
  login: (identifier, password) => 
    apiClient.post('/auth/login', { identifier, password }),
  registerStudent: (payload) =>
    apiClient.post('/auth/register-student', payload),
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

export const adminAPI = {
  getUsers: (params) => apiClient.get('/api/admin/users', { params }),
  getOfficers: () => apiClient.get('/api/admin/officers'),
  getInstitutes: (params) => apiClient.get('/api/admin/institutes', { params }),
  getInstituteStudents: (instituteId, params) => apiClient.get(`/api/admin/institutes/${instituteId}/students`, { params }),
  getMonitoring: () => apiClient.get('/api/admin/monitoring'),
  backfillScores: () => apiClient.post('/api/admin/backfill-risk-scores'),
  generateAlerts: () => apiClient.post('/api/admin/generate-alerts'),
};

export const mlflowAPI = {
  getStatus: () => apiClient.get('/api/mlflow/status'),
  getSummary: () => apiClient.get('/api/mlflow/summary'),
  getExperiments: () => apiClient.get('/api/mlflow/experiments'),
  getRuns: (experimentId, params) => apiClient.get(`/api/mlflow/experiments/${experimentId}/runs`, { params }),
  getRun: (runId) => apiClient.get(`/api/mlflow/runs/${runId}`),
};

export const officerAPI = {
  getDashboard: () => apiClient.get('/api/officer/dashboard'),
  searchStudents: (params) => apiClient.get('/api/officer/students', { params }),
};

export const caseAPI = {
  list: (params) => apiClient.get('/api/cases/', { params }),
  detail: (caseId) => apiClient.get(`/api/cases/${caseId}`),
  decide: (caseId, decision, reason) => apiClient.post(`/api/cases/${caseId}/decision`, { decision, reason }),
  updateStatus: (caseId, status, note) => apiClient.post(`/api/cases/${caseId}/status`, { status, note }),
};

export const messageAPI = {
  list: (caseId) => apiClient.get(`/api/messages/case/${caseId}`),
  send: (caseId, body, receiver_user_id = null) => apiClient.post(`/api/messages/case/${caseId}`, { body, receiver_user_id }),
};

export const studentPortalAPI = {
  me: () => apiClient.get('/api/student-portal/me'),
  listInstitutes: (params) => apiClient.get('/api/student-portal/institutes', { params }),
  updateProfile: (payload) => apiClient.put('/api/student-portal/profile', payload),
  analyze: () => apiClient.post('/api/student-portal/analyze'),
};

export default apiClient;
