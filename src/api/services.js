import client from './client.js';

// ─── Auth Service ───
export const authService = {
  login: (credentials) => client.post('/auth/login', credentials),
  googleAuth: (credential) => client.post('/auth/google', { credential }),
  completeGoogleProfile: (data) => client.post('/auth/google/complete-profile', data),
  logout: () => client.post('/auth/logout'),
  getMe: () => client.get('/auth/me'),
  changePassword: (data) => client.post('/auth/change-password', data),
  resetPassword: (userId) => client.post(`/auth/reset-password/${userId}`),
};

// ─── Employee Service ───
export const employeeService = {
  getAll: (params) => client.get('/employees', { params }),
  getById: (id) => client.get(`/employees/${id}`),
  create: (data) => client.post('/employees', data),
  update: (id, data) => client.put(`/employees/${id}`, data),
  toggleStatus: (id) => client.patch(`/employees/${id}/toggle-status`),
  delete: (id) => client.delete(`/employees/${id}`),
  getSummary: (id, params) => client.get(`/employees/${id}/summary`, { params }),
  getPending: () => client.get('/employees/pending'),
  approve: (id) => client.patch(`/employees/${id}/approve`),
  reject: (id, reason) => client.patch(`/employees/${id}/reject`, { reason }),
  suspend: (id) => client.patch(`/employees/${id}/suspend`),
  reactivate: (id) => client.patch(`/employees/${id}/reactivate`),
};

// ─── Session Service ───
export const sessionService = {
  getAll: (params) => client.get('/sessions', { params }),
  getById: (id) => client.get(`/sessions/${id}`),
  checkIn: (data) => client.post('/sessions/check-in', data),
  checkOut: (id, data) => client.post(`/sessions/${id}/check-out`, data),
  getMySessions: (params) => client.get('/sessions/my', { params }),
  getLocationPoints: (id) => client.get(`/sessions/${id}/locations`),
};

// ─── Location Service ───
export const locationService = {
  upload: (data) => client.post('/locations/batch', data),
  getRoute: (sessionId) => client.get(`/locations/route/${sessionId}`),
};

// ─── Store Service ───
export const storeService = {
  getAll: (params) => client.get('/stores', { params }),
  getById: (id) => client.get(`/stores/${id}`),
  create: (data) => client.post('/stores', data),
  update: (id, data) => client.put(`/stores/${id}`, data),
  delete: (id) => client.delete(`/stores/${id}`),
};

// ─── Product Service ───
export const productService = {
  getAll: (params) => client.get('/products', { params }),
  getById: (id) => client.get(`/products/${id}`),
  create: (data) => client.post('/products', data),
  update: (id, data) => client.put(`/products/${id}`, data),
  delete: (id) => client.delete(`/products/${id}`),
};

// ─── Visit Service ───
export const visitService = {
  getAll: (params) => client.get('/visits', { params }),
  getById: (id) => client.get(`/visits/${id}`),
  create: (data) => client.post('/visits', data),
  getMyVisits: (params) => client.get('/visits/my', { params }),
  correct: (id, data) => client.post(`/visits/${id}/correct`, data),
};

// ─── Dashboard Service ───
export const dashboardService = {
  getSummary: (params) => client.get('/dashboard/summary', { params }),
  getAttendanceChart: (params) => client.get('/dashboard/attendance-chart', { params }),
  getVisitsChart: (params) => client.get('/dashboard/visits-chart', { params }),
  getTopEmployees: (params) => client.get('/dashboard/top-employees', { params }),
  getProductChart: (params) => client.get('/dashboard/product-chart', { params }),
  getRecentActivity: (params) => client.get('/dashboard/recent-activity', { params }),
};

// ─── Report Service ───
export const reportService = {
  getByEmployee: (params) => client.get('/reports/by-employee', { params }),
  getByStore: (params) => client.get('/reports/by-store', { params }),
  getByProduct: (params) => client.get('/reports/by-product', { params }),
  getByDate: (params) => client.get('/reports/by-date', { params }),
  exportPDF: (params) => client.get('/reports/export/pdf', { params, responseType: 'blob' }),
  exportExcel: (params) => client.get('/reports/export/excel', { params, responseType: 'blob' }),
  exportCSV: (params) => client.get('/reports/export/csv', { params, responseType: 'blob' }),
};

// ─── Audit Service ───
export const auditService = {
  getAll: (params) => client.get('/audit-logs', { params }),
};

// ─── Settings Service ───
export const settingsService = {
  getAll: () => client.get('/settings'),
  getById: (id) => client.get(`/settings/${id}`),
  update: (id, data) => client.put(`/settings/${id}`, data),
};
