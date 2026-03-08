import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 创建 axios 实例
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求拦截器：添加认证 token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 响应拦截器：统一错误处理
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// 用户认证 API
export const authApi = {
    login: (username, password) => api.post('/auth/login', { username, password }),
    register: (username, password, email) => api.post('/auth/register', { username, password, email }),
    logout: () => api.post('/auth/logout'),
    getCurrentUser: () => api.get('/auth/me')
};

// 排行榜 API
export const scoreApi = {
    getLeaderboard: (limit = 10) => api.get(`/scores?limit=${limit}`),
    submitScore: (username, score) => api.post('/scores', { username, score }),
    getUserScores: (username) => api.get(`/scores/user/${username}`)
};

// 存档 API
export const archiveApi = {
    saveArchive: (data) => api.post('/archives', data),
    getArchives: () => api.get('/archives'),
    deleteArchive: (id) => api.delete(`/archives/${id}`)
};

export default api;
