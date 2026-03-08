/**
 * aiApi.js
 * 
 * AI 控制相关 API
 * 用于前端与 AI 控制接口通信
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * AI 控制 API
 */
export const aiApi = {
    /**
     * 获取当前游戏模式
     */
    getMode: () => api.get('/ai/mode'),

    /**
     * 切换游戏模式（MANUAL/AI）
     * @param {string} mode - 'MANUAL' 或 'AI'
     */
    setMode: (mode) => api.post('/ai/mode', { mode }),

    /**
     * 上报游戏状态到后端
     * @param {Object} state - 游戏状态对象
     */
    reportState: (state) => api.post('/ai/state', state),

    /**
     * 获取游戏状态
     */
    getState: () => api.get('/ai/state'),

    /**
     * 获取待执行的动作（前端轮询使用）
     */
    getActions: () => api.get('/ai/action'),

    /**
     * AI 执行动作
     * @param {string} action - 动作名称
     */
    sendAction: (action) => api.post('/ai/action', { action }),

    /**
     * 开始新游戏
     */
    startGame: () => api.post('/ai/start'),

    /**
     * 重置游戏
     */
    resetGame: () => api.post('/ai/reset'),

    /**
     * 获取方块形状定义
     */
    getShapes: () => api.get('/ai/shapes'),

    /**
     * 健康检查
     */
    health: () => api.get('/ai/health')
};

export default aiApi;
