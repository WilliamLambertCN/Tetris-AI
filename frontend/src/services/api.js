/**
 * api.js
 * 
 * 后端 API 服务封装
 * 使用 Axios 进行 HTTP 请求，包含请求/响应拦截器
 * 
 * @description 本文件包含：
 *   - Axios 实例配置（基础 URL、超时、Headers）
 *   - 请求拦截器：自动添加认证 Token
 *   - 响应拦截器：统一错误处理
 *   - 按模块封装的 API 方法（auth, score, archive）
 * 
 * @usage
 *   import api, { authApi, scoreApi } from './services/api';
 *   const response = await scoreApi.getLeaderboard(10);
 */

import axios from 'axios';

// ============================================
// Axios 实例配置
// ============================================

/**
 * 后端 API 基础 URL
 * 优先从环境变量读取，默认使用 localhost:3001
 * 
 * @tip 生产环境可在 .env 文件中设置：
 *   VITE_API_URL=https://api.example.com/api
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Axios 实例
 * 所有 API 请求都通过这个实例发起
 */
const api = axios.create({
    baseURL: API_BASE_URL,      // 基础 URL，所有请求路径前会自动添加
    timeout: 10000,             // 请求超时时间（10秒）
    headers: {
        'Content-Type': 'application/json'  // 默认请求格式为 JSON
    }
});

// ============================================
// 请求拦截器
// ============================================

/**
 * 请求发送前的拦截器
 * 用于：添加认证 Token、修改请求配置等
 */
api.interceptors.request.use(
    // 请求成功处理
    (config) => {
        // 从 localStorage 获取 token（JWT 认证）
        const token = localStorage.getItem('token');
        
        // 如果有 token，添加到请求头
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    // 请求错误处理
    (error) => Promise.reject(error)
);

// ============================================
// 响应拦截器
// ============================================

/**
 * 响应接收后的拦截器
 * 用于：统一错误处理、Token 过期处理等
 */
api.interceptors.response.use(
    // 响应成功处理：直接返回响应数据
    (response) => response,
    
    // 响应错误处理
    (error) => {
        // 401 未授权：Token 过期或无效
        if (error.response?.status === 401) {
            // 清除本地 token
            localStorage.removeItem('token');
            // 跳转到登录页
            window.location.href = '/login';
        }
        
        return Promise.reject(error);
    }
);

// ============================================
// API 模块封装
// ============================================

/**
 * 用户认证 API
 * 
 * @example
 *   // 登录
 *   const { data } = await authApi.login('user', 'pass');
 *   localStorage.setItem('token', data.token);
 *   
 *   // 注册
 *   await authApi.register('newuser', 'password', 'email@example.com');
 */
export const authApi = {
    /**
     * 用户登录
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {Promise} 登录成功返回用户信息和 token
     */
    login: (username, password) => api.post('/auth/login', { username, password }),
    
    /**
     * 用户注册
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @param {string} email - 邮箱（可选）
     * @returns {Promise} 注册结果
     */
    register: (username, password, email) => api.post('/auth/register', { username, password, email }),
    
    /**
     * 退出登录
     * @returns {Promise} 登出结果
     */
    logout: () => api.post('/auth/logout'),
    
    /**
     * 获取当前用户信息
     * @returns {Promise} 用户信息
     */
    getCurrentUser: () => api.get('/auth/me')
};

/**
 * 排行榜 API
 * 
 * @example
 *   // 获取前10名
 *   const { data } = await scoreApi.getLeaderboard(10);
 *   
 *   // 提交分数
 *   await scoreApi.submitScore('player1', 1500);
 */
export const scoreApi = {
    /**
     * 获取排行榜
     * @param {number} limit - 返回数量（默认10）
     * @returns {Promise} 排行榜列表 [{ username, score, createdAt }, ...]
     */
    getLeaderboard: (limit = 10) => api.get(`/scores?limit=${limit}`),
    
    /**
     * 提交分数
     * @param {string} username - 玩家名
     * @param {number} score - 分数
     * @returns {Promise} 提交结果
     */
    submitScore: (username, score) => api.post('/scores', { username, score }),
    
    /**
     * 获取指定用户的历史成绩
     * @param {string} username - 用户名
     * @returns {Promise} 该用户的所有分数记录
     */
    getUserScores: (username) => api.get(`/scores/user/${username}`)
};

/**
 * 存档 API（预留接口）
 * 用于保存/加载游戏进度
 */
export const archiveApi = {
    /**
     * 保存游戏存档
     * @param {Object} data - 存档数据（棋盘状态、分数等）
     * @returns {Promise} 保存结果
     */
    saveArchive: (data) => api.post('/archives', data),
    
    /**
     * 获取存档列表
     * @returns {Promise} 存档列表
     */
    getArchives: () => api.get('/archives'),
    
    /**
     * 删除存档
     * @param {string} id - 存档 ID
     * @returns {Promise} 删除结果
     */
    deleteArchive: (id) => api.delete(`/archives/${id}`)
};

// 默认导出 axios 实例（用于直接发起请求）
export default api;
