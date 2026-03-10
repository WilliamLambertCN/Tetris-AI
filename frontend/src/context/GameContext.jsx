import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import * as CONSTANTS from '../utils/constants';
import { aiApi } from '../services/aiApi';

// ============================================
// 游戏常量定义
// ============================================

const SHAPES = {
    I: {
        shape: [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0]
        ],
        color: '#00f5ff'
    },
    J: {
        shape: [
            [0, 1, 0],
            [0, 1, 0],
            [1, 1, 0]
        ],
        color: '#0099ff'
    },
    L: {
        shape: [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 1]
        ],
        color: '#ff9900'
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#ffff00'
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#00ff66'
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#9900ff'
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: '#ff3333'
    }
};

// ============================================
// 游戏核心算法函数
// ============================================

const collide = (pieceShape, pieceX, pieceY, board) => {
    for (let row = 0; row < pieceShape.length; row++) {
        for (let col = 0; col < pieceShape[row].length; col++) {
            if (pieceShape[row][col]) {
                const newX = pieceX + col;
                const newY = pieceY + row;
                if (newX < 0 || newX >= CONSTANTS.COLS || newY >= CONSTANTS.ROWS) return true;
                if (newY >= 0 && board[newY][newX]) return true;
            }
        }
    }
    return false;
};

const rotatePiece = (piece, board) => {
    const shape = piece.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    const newShape = [];
    for (let col = 0; col < cols; col++) {
        newShape[col] = [];
        for (let row = rows - 1; row >= 0; row--) {
            newShape[col].push(shape[row][col]);
        }
    }
    const newRotation = ((piece.rotation || 0) + 1) % 4;  // 更新 rotation 状态
    const newPiece = { ...piece, shape: newShape.map(row => [...row]), rotation: newRotation };
    if (collide(newPiece.shape, newPiece.x, newPiece.y, board)) {
        const directions = [-1, 1, -2, 2];
        for (const direction of directions) {
            const kickedPiece = { ...newPiece, x: newPiece.x + direction, rotation: newRotation };
            if (!collide(kickedPiece.shape, kickedPiece.x, kickedPiece.y, board)) {
                return kickedPiece;
            }
        }
        return piece;
    }
    return newPiece;
};

const drawBlock = (ctx, x, y, color, size) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size - 1, size - 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * size, y * size, size - 1, size / 4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x * size, y * size + size - size / 4, size - 1, size / 4);
};

const drawBoard = (ctx, board, rows, cols, blockSize) => {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (board[row][col]) {
                drawBlock(ctx, col, row, board[row][col], blockSize);
            } else {
                ctx.strokeStyle = '#1a1a3e';
                ctx.strokeRect(col * blockSize, row * blockSize, blockSize, blockSize);
            }
        }
    }
};

const drawPiece = (ctx, piece, blockSize) => {
    if (!piece) return;
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (piece.shape[row][col]) {
                drawBlock(ctx, piece.x + col, piece.y + row, piece.color, blockSize);
            }
        }
    }
};

const drawNextPiece = (ctx, nextPiece, blockSize = 20) => {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (nextPiece) {
        const shape = nextPiece.shape;
        const offsetX = (4 - shape[0].length) / 2;
        const offsetY = (4 - shape.length) / 2;
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    drawBlock(ctx, offsetX + col, offsetY + row, nextPiece.color, blockSize);
                }
            }
        }
    }
};

const getAllPieceTypes = () => Object.keys(SHAPES);
const createPiece = (type) => ({
    type,
    shape: SHAPES[type].shape.map(row => [...row]),
    color: SHAPES[type].color,
    x: Math.floor(CONSTANTS.COLS / 2) - Math.ceil(SHAPES[type].shape[0].length / 2),
    y: 0,
    rotation: 0  // 追踪旋转状态，AI 需要
});
const spawnPiece = (nextPiece) => {
    const types = getAllPieceTypes();
    const currentPiece = nextPiece || createPiece(types[Math.floor(Math.random() * types.length)]);
    const newNextPiece = createPiece(types[Math.floor(Math.random() * types.length)]);
    return { currentPiece, nextPiece: newNextPiece };
};
const lockPiece = (board, currentPiece) => {
    const newBoard = board.map(row => [...row]);
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const boardY = currentPiece.y + row;
                if (boardY >= 0) {
                    newBoard[boardY][currentPiece.x + col] = currentPiece.color;
                }
            }
        }
    }
    return newBoard;
};
const checkLines = (board) => {
    const newBoard = board.filter(row => !row.every(cell => cell !== null));
    const linesCleared = CONSTANTS.ROWS - newBoard.length;
    while (newBoard.length < CONSTANTS.ROWS) {
        newBoard.unshift(Array(CONSTANTS.COLS).fill(null));
    }
    return { newBoard, linesCleared };
};

// ============================================
// Context 定义
// ============================================

export const GameContext = createContext();

export function GameProvider({ children }) {
    const boardCanvasRef = useRef(null);
    const nextCanvasRef = useRef(null);
    const dropIntervalRef = useRef(CONSTANTS.INITIAL_DROP_INTERVAL);
    const animationIdRef = useRef(null);
    const lastTimeRef = useRef(0);
    const currentPieceRef = useRef(null);
    const boardRef = useRef(null);
    const aiActionQueueRef = useRef([]);

    const initBoard = useCallback(() => {
        return Array.from({ length: CONSTANTS.ROWS }, () => Array(CONSTANTS.COLS).fill(null));
    }, []);

    const [board, setBoard] = useState(initBoard);
    const [currentPiece, setCurrentPiece] = useState(null);
    const [nextPiece, setNextPiece] = useState(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [paused, setPaused] = useState(false);
    const [aiMode, setAiMode] = useState(false);
    const [aiStatus, setAiStatus] = useState('idle');
    const [aiThinking, setAiThinking] = useState({
        isThinking: false,
        targetX: null,
        targetY: null,
        targetRotation: null,
        plannedActions: [],
        searchNodes: 0,
        searchTime: 0,
        evaluationScore: 0
    });

    useEffect(() => {
        currentPieceRef.current = currentPiece;
    }, [currentPiece]);
    
    useEffect(() => {
        boardRef.current = board;
    }, [board]);

    // ========================================
    // 渲染函数
    // ========================================

    const renderGame = useCallback(() => {
        if (!boardCanvasRef.current) return;
        const ctx = boardCanvasRef.current.getContext('2d');
        drawBoard(ctx, board, CONSTANTS.ROWS, CONSTANTS.COLS, CONSTANTS.BLOCK_SIZE);
        drawPiece(ctx, currentPieceRef.current, CONSTANTS.BLOCK_SIZE);
    }, [board]);

    const renderNextPiece = useCallback(() => {
        if (!nextCanvasRef.current) return;
        const ctx = nextCanvasRef.current.getContext('2d');
        drawNextPiece(ctx, nextPiece, 20);
    }, [nextPiece]);

    useEffect(() => { renderGame(); }, [renderGame]);
    useEffect(() => { renderNextPiece(); }, [renderNextPiece]);

    // ========================================
    // 游戏控制
    // ========================================

    const startGame = useCallback(() => {
        const newBoard = initBoard();
        setBoard(newBoard);
        setScore(0);
        setLevel(1);
        dropIntervalRef.current = CONSTANTS.INITIAL_DROP_INTERVAL;
        setGameOver(false);
        setPaused(false);
        let nextPieceLocal = null;
        const result = spawnPiece(nextPieceLocal);
        setNextPiece(result.nextPiece);
        setCurrentPiece(result.currentPiece);
        if (animationIdRef.current !== null) {
            cancelAnimationFrame(animationIdRef.current);
        }
        lastTimeRef.current = performance.now();
    }, [initBoard]);

    const togglePause = useCallback(() => {
        setPaused(prev => {
            const newPaused = !prev;
            if (!newPaused && !gameOver) {
                lastTimeRef.current = performance.now();
            }
            return newPaused;
        });
    }, [gameOver]);

    const toggleAiMode = useCallback(async () => {
        const newMode = !aiMode;
        setAiMode(newMode);
        try {
            await aiApi.setMode(newMode ? 'AI' : 'MANUAL');
        } catch (err) {
            console.error('Failed to switch AI mode:', err);
        }
    }, [aiMode]);

    // ========================================
    // AI 状态上报
    // ========================================
    
    useEffect(() => {
        if (!aiMode) return;
        
        const interval = setInterval(async () => {
            try {
                // 转换棋盘格式：0/1 格式，AI 需要
                const binaryBoard = board.map(row =>
                    row.map(cell => cell ? 1 : 0)
                );
                
                await aiApi.reportState({
                    board: binaryBoard,
                    currentPiece: currentPiece ? {
                        type: currentPiece.type,
                        x: currentPiece.x,
                        y: currentPiece.y,
                        rotation: currentPiece.rotation || 0,  // 添加 rotation 字段
                        shape: currentPiece.shape
                    } : null,
                    nextPiece: nextPiece ? {
                        type: nextPiece.type,
                        shape: nextPiece.shape
                    } : null,
                    score,
                    level,
                    gameOver
                });
            } catch (err) {
                // 静默处理
            }
        }, 20); // 20ms 上报一次，让 AI 更快获取最新状态
        
        return () => clearInterval(interval);
    }, [aiMode, board, currentPiece, nextPiece, score, level, gameOver]);
    
    // 辅助函数：计算棋盘非零格数（用于调试）
    const countBoardCells = useCallback((boardData) => {
        return boardData.reduce((sum, row) => sum + row.filter(cell => cell !== null && cell !== 0).length, 0);
    }, []);

    // ========================================
    // 方块移动函数
    // ========================================

    const moveDown = useCallback(() => {
        const piece = currentPieceRef.current;
        if (!piece) return false;
        if (!collide(piece.shape, piece.x, piece.y + 1, board)) {
            const newPiece = { ...piece, y: piece.y + 1 };
            setCurrentPiece(newPiece);
            return false;
        } else {
            const lockedBoard = lockPiece(board, piece);
            const { newBoard, linesCleared } = checkLines(lockedBoard);
            setBoard(newBoard);
            if (linesCleared > 0) {
                const points = [0, 100, 300, 500, 800];
                const newScore = score + points[linesCleared] * level;
                setScore(newScore);
                const newLevel = Math.floor(newScore / CONSTANTS.LEVEL_UP_SCORE) + 1;
                if (newLevel > level) {
                    setLevel(newLevel);
                    dropIntervalRef.current = Math.max(
                        CONSTANTS.MIN_DROP_INTERVAL,
                        CONSTANTS.INITIAL_DROP_INTERVAL - (newLevel - 1) * 100
                    );
                }
            }
            const result = spawnPiece(nextPiece);
            setNextPiece(result.nextPiece);
            setCurrentPiece(result.currentPiece);
            if (collide(result.currentPiece.shape, result.currentPiece.x, result.currentPiece.y, newBoard)) {
                setGameOver(true);
            }
            return true;
        }
    }, [board, score, level, nextPiece]);

    const moveLeft = useCallback(() => {
        const piece = currentPieceRef.current;
        if (!piece) return;
        if (!collide(piece.shape, piece.x - 1, piece.y, board)) {
            setCurrentPiece({ ...piece, x: piece.x - 1 });
        }
    }, [board]);

    const moveRight = useCallback(() => {
        const piece = currentPieceRef.current;
        if (!piece) return;
        if (!collide(piece.shape, piece.x + 1, piece.y, board)) {
            setCurrentPiece({ ...piece, x: piece.x + 1 });
        }
    }, [board]);

    const rotate = useCallback(() => {
        const piece = currentPieceRef.current;
        if (!piece) return;
        const rotatedPiece = rotatePiece(piece, board);
        setCurrentPiece(rotatedPiece);
    }, [board]);

    // ========================================
    // AI 动作执行
    // ========================================

    const executeAiAction = useCallback((action) => {
        if (!aiMode || paused || gameOver) {
            console.log('[AI] Action blocked:', { aiMode, paused, gameOver, action });
            return;
        }
        console.log('[AI] Executing:', action);
        switch (action) {
            case 'left': 
                moveLeft(); 
                break;
            case 'right': 
                moveRight(); 
                break;
            case 'rotate': 
                rotate(); 
                break;
            case 'down': 
                moveDown(); 
                break;
            case 'hard_drop': {
                // AI 硬降：使用 boardRef 获取最新 board 状态并一次性完成
                console.log('[AI] Hard drop starting');
                
                const piece = currentPieceRef.current;
                const currentBoard = boardRef.current;
                
                if (!piece || !currentBoard) break;
                
                // 1. 计算最终落点
                let dropY = piece.y;
                while (!collide(piece.shape, piece.x, dropY + 1, currentBoard)) {
                    dropY++;
                }
                
                // 2. 构造落地时的方块
                const landedPiece = { ...piece, y: dropY };
                
                // 3. 执行锁定逻辑 (参考 moveDown 的 else 分支)
                const lockedBoard = lockPiece(currentBoard, landedPiece);
                const { newBoard, linesCleared } = checkLines(lockedBoard);
                
                // 4. 更新分数
                if (linesCleared > 0) {
                    const points = [0, 100, 300, 500, 800];
                    const newScore = score + points[linesCleared] * level;
                    setScore(newScore);
                    const newLevel = Math.floor(newScore / CONSTANTS.LEVEL_UP_SCORE) + 1;
                    if (newLevel > level) {
                        setLevel(newLevel);
                        dropIntervalRef.current = Math.max(
                            CONSTANTS.MIN_DROP_INTERVAL,
                            CONSTANTS.INITIAL_DROP_INTERVAL - (newLevel - 1) * 100
                        );
                    }
                }
                
                // 5. 生成新方块
                const result = spawnPiece(nextPiece);
                
                // 6. 批量更新状态
                setBoard(newBoard);
                setNextPiece(result.nextPiece);
                setCurrentPiece(result.currentPiece);
                
                // 7. 检查游戏结束
                if (collide(result.currentPiece.shape, result.currentPiece.x, result.currentPiece.y, newBoard)) {
                    setGameOver(true);
                }
                
                console.log('[AI] Hard drop complete, landed at Y:', dropY);
                break;
            }
        }
    }, [aiMode, paused, gameOver, moveLeft, moveRight, rotate, moveDown]);

    // ========================================
    // 游戏主循环 (保持自然重力，AI 在真实环境下运行)
    // ========================================

    useEffect(() => {
        if (gameOver || paused || !currentPiece) return;
        const gameLoop = (currentTime) => {
            if (gameOver || paused) return;
            const deltaTime = currentTime - lastTimeRef.current;
            if (deltaTime >= dropIntervalRef.current) {
                moveDown();
                lastTimeRef.current = currentTime;
            }
            renderGame();
            animationIdRef.current = requestAnimationFrame(gameLoop);
        };
        animationIdRef.current = requestAnimationFrame(gameLoop);
        return () => {
            if (animationIdRef.current !== null) {
                cancelAnimationFrame(animationIdRef.current);
            }
        };
    }, [gameOver, paused, currentPiece, moveDown, renderGame]);

    // ========================================
    // AI 动作轮询
    // ========================================

    // 获取 AI 动作 - 高频轮询
    useEffect(() => {
        if (!aiMode || gameOver) return;
        const interval = setInterval(async () => {
            try {
                const response = await aiApi.getActions();
                const actions = response.data.actions || [];
                if (actions.length > 0) {
                    console.log('[AI] Raw actions from API:', JSON.stringify(actions));
                    actions.forEach((item) => {
                        // 处理不同的数据格式
                        const action = typeof item === 'string' ? item : (item.action || item);
                        if (action) {
                            aiActionQueueRef.current.push(action);
                            console.log('[AI] Queued action:', action);
                        }
                    });
                }
            } catch (err) {
                console.error('Failed to get AI actions:', err);
            }
        }, 20); // 20ms 轮询一次
        return () => clearInterval(interval);
    }, [aiMode, gameOver]);

    // 快速执行 AI 动作 - 高频执行
    useEffect(() => {
        if (!aiMode || gameOver) return;
        
        const interval = setInterval(() => {
            // 每次执行一个动作，保持与 AI 同步
            if (aiActionQueueRef.current.length > 0) {
                const action = aiActionQueueRef.current.shift();
                executeAiAction(action);
            }
        }, 10); // 每 10ms 执行一个动作，约 100fps
        
        return () => clearInterval(interval);
    }, [aiMode, gameOver]);

    // ========================================
    // AI 思考状态轮询
    // ========================================

    useEffect(() => {
        if (!aiMode) return;
        const interval = setInterval(async () => {
            try {
                const response = await aiApi.getThinking();
                const thinking = response.data;
                setAiThinking({
                    isThinking: thinking.isThinking || false,
                    targetX: thinking.targetX,
                    targetY: thinking.targetY,
                    targetRotation: thinking.targetRotation,
                    plannedActions: thinking.plannedActions || [],
                    searchNodes: thinking.searchNodes || 0,
                    searchTime: thinking.searchTime || 0,
                    evaluationScore: thinking.evaluationScore || 0
                });
            } catch (err) {}
        }, 50);
        return () => clearInterval(interval);
    }, [aiMode]);

    // ========================================
    // 键盘事件
    // ========================================

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameOver) return;
            switch (e.key) {
                case 'ArrowLeft': if (!paused) moveLeft(); break;
                case 'ArrowRight': if (!paused) moveRight(); break;
                case 'ArrowDown': if (!paused) moveDown(); break;
                case 'ArrowUp': if (!paused) rotate(); break;
                case ' ': e.preventDefault(); togglePause(); break;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [gameOver, paused, moveLeft, moveRight, moveDown, rotate, togglePause]);

    // ========================================
    // Context Value
    // ========================================

    const value = {
        board, currentPiece, nextPiece, score, level, gameOver, paused,
        aiMode, aiStatus, aiThinking,
        boardCanvasRef, nextCanvasRef,
        startGame, togglePause, renderGame, renderNextPiece, toggleAiMode, executeAiAction
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

export default GameProvider;
