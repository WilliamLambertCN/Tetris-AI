/**
 * ai.js
 * 
 * AI 控制路由
 * 提供接口供外部 AI 算法控制游戏
 */

import express from 'express';

const router = express.Router();

// 游戏状态存储（每个客户端一个游戏实例）
const gameInstances = new Map();

// 游戏模式：MANUAL（手动）/ AI（自动控制）
let gameMode = 'MANUAL';

// 当前游戏状态（由前端通过 POST 上报）
let currentGameState = null;

// AI 思考状态（由 AI 上报，供前端可视化）
let aiThinkingState = {
    isThinking: false,
    currentPiece: null,
    targetX: null,
    targetY: null,
    targetRotation: null,
    plannedActions: [],
    searchNodes: 0,
    searchTime: 0,
    evaluationScore: 0,
    timestamp: 0
};

/**
 * 初始化空棋盘
 */
function initBoard() {
    return Array.from({ length: 20 }, () => Array(10).fill(0));
}

/**
 * 方块形状定义（与前端一致）
 */
const SHAPES = {
    I: {
        shapes: [
            [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]],
            [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
            [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
            [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]]
        ],
        color: '#00f5ff'
    },
    J: {
        shapes: [
            [[0,1,0], [0,1,0], [1,1,0]],
            [[1,0,0], [1,1,1], [0,0,0]],
            [[0,1,1], [0,1,0], [0,1,0]],
            [[0,0,0], [1,1,1], [0,0,1]]
        ],
        color: '#0099ff'
    },
    L: {
        shapes: [
            [[0,1,0], [0,1,0], [0,1,1]],
            [[0,0,0], [1,1,1], [1,0,0]],
            [[1,1,0], [0,1,0], [0,1,0]],
            [[0,0,1], [1,1,1], [0,0,0]]
        ],
        color: '#ff9900'
    },
    O: {
        shapes: [
            [[1,1], [1,1]],
            [[1,1], [1,1]],
            [[1,1], [1,1]],
            [[1,1], [1,1]]
        ],
        color: '#ffff00'
    },
    S: {
        shapes: [
            [[0,1,1], [1,1,0], [0,0,0]],
            [[0,1,0], [0,1,1], [0,0,1]],
            [[0,0,0], [0,1,1], [1,1,0]],
            [[1,0,0], [1,1,0], [0,1,0]]
        ],
        color: '#00ff66'
    },
    T: {
        shapes: [
            [[0,1,0], [1,1,1], [0,0,0]],
            [[0,1,0], [0,1,1], [0,1,0]],
            [[0,0,0], [1,1,1], [0,1,0]],
            [[0,1,0], [1,1,0], [0,1,0]]
        ],
        color: '#9900ff'
    },
    Z: {
        shapes: [
            [[1,1,0], [0,1,1], [0,0,0]],
            [[0,0,1], [0,1,1], [0,1,0]],
            [[0,0,0], [1,1,0], [0,1,1]],
            [[0,1,0], [1,1,0], [1,0,0]]
        ],
        color: '#ff3333'
    }
};

// ============================================
// AI 控制接口
// ============================================

/**
 * GET /api/ai/state
 * 获取当前游戏状态
 */
router.get('/state', (req, res) => {
    if (!currentGameState) {
        return res.status(404).json({ error: 'No active game' });
    }
    res.json(currentGameState);
});

/**
 * POST /api/ai/state
 * 前端上报游戏状态
 */
router.post('/state', (req, res) => {
    const { board, currentPiece, nextPiece, score, level, gameOver } = req.body;
    
    currentGameState = {
        board: board || initBoard(),
        currentPiece: currentPiece || null,
        nextPiece: nextPiece || null,
        score: score || 0,
        level: level || 1,
        gameOver: gameOver || false,
        timestamp: Date.now()
    };
    
    res.json({ message: 'State updated', timestamp: currentGameState.timestamp });
});

/**
 * POST /api/ai/action
 * 执行动作（由 AI 调用）
 * 动作通过 WebSocket 或事件机制转发给前端
 */
router.post('/action', (req, res) => {
    const { action, clientId = 'default' } = req.body;
    
    const validActions = ['left', 'right', 'rotate', 'down', 'hard_drop', 'start'];
    if (!validActions.includes(action)) {
        return res.status(400).json({ error: 'Invalid action', validActions });
    }
    
    // 存储动作，供前端轮询获取
    if (!gameInstances.has(clientId)) {
        gameInstances.set(clientId, { actions: [] });
    }
    
    const instance = gameInstances.get(clientId);
    instance.actions.push({
        action,
        timestamp: Date.now()
    });
    
    // 只保留最近 10 个动作
    if (instance.actions.length > 10) {
        instance.actions.shift();
    }
    
    res.json({ message: 'Action queued', action });
});

/**
 * GET /api/ai/action
 * 前端轮询获取待执行的动作
 */
router.get('/action', (req, res) => {
    const { clientId = 'default' } = req.query;
    
    const instance = gameInstances.get(clientId);
    if (!instance || instance.actions.length === 0) {
        return res.json({ actions: [] });
    }
    
    const actions = [...instance.actions];
    instance.actions = []; // 清空已获取的动作
    
    res.json({ actions });
});

/**
 * GET /api/ai/mode
 * 获取当前游戏模式
 */
router.get('/mode', (req, res) => {
    res.json({ 
        mode: gameMode,
        modes: ['MANUAL', 'AI']
    });
});

/**
 * POST /api/ai/mode
 * 切换游戏模式
 */
router.post('/mode', (req, res) => {
    const { mode } = req.body;
    
    if (!['MANUAL', 'AI'].includes(mode)) {
        return res.status(400).json({ error: 'Invalid mode. Use MANUAL or AI' });
    }
    
    gameMode = mode;
    res.json({ message: 'Mode switched', mode: gameMode });
});

/**
 * POST /api/ai/start
 * 开始新游戏
 */
router.post('/start', (req, res) => {
    currentGameState = {
        board: initBoard(),
        currentPiece: null,
        nextPiece: null,
        score: 0,
        level: 1,
        gameOver: false,
        timestamp: Date.now()
    };
    
    res.json({ message: 'Game started', state: currentGameState });
});

/**
 * POST /api/ai/reset
 * 重置游戏
 */
router.post('/reset', (req, res) => {
    currentGameState = null;
    gameInstances.clear();
    gameMode = 'MANUAL';
    
    res.json({ message: 'Game reset' });
});

/**
 * POST /api/ai/thinking
 * AI 上报思考状态（供前端可视化）
 */
router.post('/thinking', (req, res) => {
    const { 
        isThinking, 
        currentPiece,
        targetX, 
        targetY, 
        targetRotation,
        plannedActions,
        searchNodes,
        searchTime,
        evaluationScore
    } = req.body;
    
    aiThinkingState = {
        isThinking: isThinking ?? aiThinkingState.isThinking,
        currentPiece: currentPiece ?? aiThinkingState.currentPiece,
        targetX: targetX ?? aiThinkingState.targetX,
        targetY: targetY ?? aiThinkingState.targetY,
        targetRotation: targetRotation ?? aiThinkingState.targetRotation,
        plannedActions: plannedActions ?? aiThinkingState.plannedActions,
        searchNodes: searchNodes ?? aiThinkingState.searchNodes,
        searchTime: searchTime ?? aiThinkingState.searchTime,
        evaluationScore: evaluationScore ?? aiThinkingState.evaluationScore,
        timestamp: Date.now()
    };
    
    res.json({ message: 'Thinking state updated' });
});

/**
 * GET /api/ai/thinking
 * 获取 AI 思考状态（前端可视化使用）
 */
router.get('/thinking', (req, res) => {
    res.json(aiThinkingState);
});

/**
 * GET /api/ai/shapes
 * 获取方块形状定义（供 AI 使用）
 */
router.get('/shapes', (req, res) => {
    // 转换形状格式，便于 AI 使用
    const shapesForAI = {};
    for (const [type, data] of Object.entries(SHAPES)) {
        shapesForAI[type] = {
            rotations: data.shapes,
            color: data.color
        };
    }
    
    res.json(shapesForAI);
});

/**
 * GET /api/ai/health
 * AI 接口健康检查
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        mode: gameMode,
        hasGameState: !!currentGameState,
        timestamp: Date.now()
    });
});

export default router;
