import client from './client.js';

// ─── Auth Service ───
export const authService = {
  login: (credentials) => client.post('/auth/login', credentials),
  googleAuth: (credential) => client.post('/auth/google', { credential }),
  completeGoogleProfile: (data) => client.post('/auth/google/complete-profile', data),
  logout: () => client.post('/auth/logout'),
  getMe: () => client.get('/auth/me'),
  changePassword: (data) => client.post('/auth/change-password', data),
  resetPassword: (userId) => client.put(`/employees/${userId}/reset-password`),
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
  checkOut: (_id, data) => client.post('/sessions/check-out', data ?? _id),
  getMySessions: (params = {}) => {
    const query = { ...params };
    if (query.date && !query.startDate && !query.endDate) {
      query.startDate = query.date;
      query.endDate = query.date;
      delete query.date;
    }
    return client.get('/sessions/me', { params: query });
  },
  getActiveSession: () => client.get('/sessions/me/active'),
  getLocationPoints: (id) => client.get(`/sessions/${id}/route`),
};

// ─── Location Service ───
export const locationService = {
  upload: (data) => client.post('/locations', data),
  getRoute: (sessionId) => client.get(`/sessions/${sessionId}/route`),
};

// ─── Store Service ───
export const storeService = {
  getAll: (params) => client.get('/stores', { params }),
  getActive: () => client.get('/stores/active'),
  getById: (id) => client.get(`/stores/${id}`),
  create: (data) => client.post('/stores', data),
  update: (id, data) => client.put(`/stores/${id}`, data),
  delete: (id) => client.delete(`/stores/${id}`),
};

// ─── Product Service ───
export const productService = {
  getAll: (params) => client.get('/products', { params }),
  getActive: () => client.get('/products/active'),
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
  getMyVisits: (params = {}) => {
    const query = { ...params };
    if (query.date && !query.startDate && !query.endDate) {
      query.startDate = query.date;
      query.endDate = query.date;
      delete query.date;
    }
    return client.get('/visits/me', { params: query });
  },
  correct: (id, data) => client.put(`/visits/${id}/correct`, data),
};

// ─── Dashboard Service ───
export const dashboardService = {
  getSummary: (params) => client.get('/dashboard/summary', { params }),
  getAttendanceChart: (params) => client.get('/dashboard/attendance-chart', { params }),
  getVisitsChart: (params) => client.get('/dashboard/visits-chart', { params }),
  getTopEmployees: (params) => client.get('/dashboard/top-employees', { params }),
  getProductChart: (params) => client.get('/dashboard/product-chart', { params }),
  getRecentActivity: (params) => client.get('/dashboard/recent-activity', { params }),
  getLive: () => client.get('/dashboard/live'),
};

// ─── Report Service ───
export const reportService = {
  getByEmployee: (params) => client.get('/reports/employee', { params }),
  getByStore: (params) => client.get('/reports/store', { params }),
  getByProduct: (params) => client.get('/reports/product', { params }),
  getByDate: (params) => client.get('/reports/date', { params }),
  exportPDF: (type, params) =>
    client.get(`/reports/export/${type}/pdf`, { params, responseType: 'blob' }),
  exportExcel: (type, params) =>
    client.get(`/reports/export/${type}/excel`, { params, responseType: 'blob' }),
  exportCSV: (type, params) =>
    client.get(`/reports/export/${type}/csv`, { params, responseType: 'blob' }),
};

// ─── Audit Service ───
export const auditService = {
  getAll: (params) => client.get('/audit', { params }),
};

// ─── Settings Service ───
export const settingsService = {
  getAll: () => client.get('/settings'),
  getById: (id) => client.get(`/settings/${id}`),
  update: (id, data) => client.put(`/settings/${id}`, data),
};
