import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('tenant');
      if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/platform')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============ TENANT APIs ============
export const tenantAPI = {
  register: (data) => api.post('/tenants/register', data),
  getBySlug: (slug) => api.get(`/tenants/${slug}`),
  getFullBySlug: (slug) => api.get(`/tenants/${slug}/full`),
  update: (slug, data) => api.put(`/tenants/${slug}`, data),
};

// ============ PLATFORM ADMIN APIs ============
export const platformAPI = {
  getAllTenants: () => api.get('/platform/tenants'),
  updateTenantStatus: (tenantId, status) => api.put(`/platform/tenants/${tenantId}/status?status=${status}`),
  createPlatformAdmin: (data, secret) => api.post(`/platform/admin/create?secret=${secret}`, data),
};

// ============ AUTH APIs ============
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// ============ SETTINGS APIs ============
export const settingsAPI = {
  get: () => api.get('/settings'),
  getPublic: (slug) => api.get(`/r/${slug}/settings`),
  update: (data) => api.put('/settings', data),
};

// ============ UPLOAD APIs ============
export const uploadAPI = {
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ============ CATEGORY APIs (Admin - uses token for tenant) ============
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getAllAdmin: () => api.get('/categories/all'),
  getPublic: (slug) => api.get(`/r/${slug}/categories`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// ============ MENU ITEM APIs ============
export const menuItemAPI = {
  getAll: (categoryId) => api.get('/menu-items', { params: { category_id: categoryId } }),
  getAllAdmin: () => api.get('/menu-items/all'),
  getPublic: (slug, categoryId) => api.get(`/r/${slug}/menu-items`, { params: { category_id: categoryId } }),
  getOne: (id) => api.get(`/menu-items/${id}`),
  create: (data) => api.post('/menu-items', data),
  update: (id, data) => api.put(`/menu-items/${id}`, data),
  delete: (id) => api.delete(`/menu-items/${id}`),
};

// ============ TABLE APIs ============
export const tableAPI = {
  getAll: () => api.get('/tables'),
  getAllAdmin: () => api.get('/tables/all'),
  getPublic: (slug) => api.get(`/r/${slug}/tables`),
  getByQR: (qrCode) => api.get(`/tables/qr/${qrCode}`),
  create: (data) => api.post('/tables', data),
  update: (id, data) => api.put(`/tables/${id}`, data),
  delete: (id) => api.delete(`/tables/${id}`),
  regenerateQR: (id) => api.post(`/tables/${id}/regenerate-qr`),
};

// ============ ORDER APIs ============
export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getActive: () => api.get('/orders/active'),
  getActivePublic: (slug) => api.get(`/r/${slug}/orders/active`),
  getPublic: (slug, tableId) => api.get(`/r/${slug}/orders`, { params: { table_id: tableId } }),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  createPublic: (slug, data) => api.post(`/r/${slug}/orders`, data),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
};

// ============ SEED DATA ============
export const seedAPI = {
  seed: () => api.post('/seed'),
};

export default api;
