/**
 * GameContext.jsx
 * 
 * 游戏全局状态管理
 * 使用 React Context API 提供游戏状态和方法给所有子组件
 * 
 * @description 本文件包含俄罗斯方块游戏的核心逻辑：
 *   - 游戏状态管理（棋盘、方块、分数等）
 *   - 游戏循环（自动下落）
 *   - 碰撞检测、旋转、消行算法
 *   - 键盘事件处理
 * 
 * @usage
 *   1. 在应用根组件包裹 GameProvider
 *      <GameProvider><App /></GameProvider>
 *   
 *   2. 在子组件中使用 useContext 获取游戏状态
 *      const { score, level, startGame } = useContext(GameContext);
 */

import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import * as CONSTANTS from '../utils/constants';

// ============================================
// 游戏常量定义
// ============================================

/**
 * 方块形状定义
 * 每个方块包含：
 *   - shape: 二维数组，1 表示有方块，0 表示空
 *   - color: 方块颜色（CSS 颜色值）
 */
const SHAPES = {
    // I 形方块（长条）
    I: {
        shape: [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0]
        ],
        color: '#00f5ff'
    },
    // J 形方块
    J: {
        shape: [
            [0, 1, 0],
            [0, 1, 0],
            [1, 1, 0]
        ],
        color: '#0099ff'
    },
    // L 形方块
    L: {
        shape: [
            [0, 1, 0],
            [0, 1, 0],
            [0, 1, 1]
        ],
        color: '#ff9900'
    },
    // O 形方块（正方形）
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#ffff00'
    },
    // S 形方块
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#00ff66'
    },
    // T 形方块
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#9900ff'
    },
    // Z 形方块
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

/**
 * 碰撞检测函数
 * 检测方块是否与边界或其他方块发生碰撞
 * 
 * @param {Array} pieceShape - 方块的形状矩阵
 * @param {number} pieceX - 方块的 X 坐标（相对于棋盘）
 * @param {number} pieceY - 方块的 Y 坐标（相对于棋盘）
 * @param {Array} board - 当前游戏棋盘状态
 * @returns {boolean} - true 表示发生碰撞，false 表示未碰撞
 * 
 * @example
 *   collide([[1,1],[1,1]], 5, 10, board) // 检查 O 形方块在 (5,10) 是否碰撞
 */
const collide = (pieceShape, pieceX, pieceY, board) => {
    // 遍历方块的每一个格子
    for (let row = 0; row < pieceShape.length; row++) {
        for (let col = 0; col < pieceShape[row].length; col++) {
            // 只检查有方块的部分（值为 1 的格子）
            if (pieceShape[row][col]) {
                // 计算该格子在棋盘上的实际坐标
                const newX = pieceX + col;
                const newY = pieceY + row;

                // 检查是否超出左右边界
                if (newX < 0 || newX >= CONSTANTS.COLS) return true;
                
                // 检查是否超出下边界
                if (newY >= CONSTANTS.ROWS) return true;

                // 检查是否与已固定的方块重叠（注意：newY >= 0 才需要检查）
                if (newY >= 0 && board[newY][newX]) return true;
            }
        }
    }
    return false;
};

/**
 * 旋转方块（顺时针90度）+ 墙踢（Wall Kick）
 * 
 * 旋转原理：矩阵转置后反转每一行
 * 墙踢原理：如果旋转后碰撞，尝试左右移动来适应
 * 
 * @param {Object} piece - 当前方块对象 { shape, x, y, color, type }
 * @param {Array} board - 当前棋盘状态
 * @returns {Object} - 旋转后的新方块对象
 * 
 * @see https://tetris.fandom.com/wiki/Wall_Kick 墙踢算法参考
 */
const rotatePiece = (piece, board) => {
    const shape = piece.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    
    // 创建新形状：顺时针旋转 = 转置后反转每一行
    const newShape = [];
    for (let col = 0; col < cols; col++) {
        newShape[col] = [];
        for (let row = rows - 1; row >= 0; row--) {
            newShape[col].push(shape[row][col]);
        }
    }

    // 创建旋转后的新方块对象（使用展开运算符复制）
    const rotatedPiece = { ...piece, shape: newShape.map(row => [...row]) };

    // 检查旋转后是否碰撞
    if (collide(rotatedPiece.shape, rotatedPiece.x, rotatedPiece.y, board)) {
        // 墙踢尝试：依次尝试向左/右移动 1-2 格
        const kickOffsets = [-1, 1, -2, 2];
        
        for (const offset of kickOffsets) {
            const kickedPiece = { ...rotatedPiece, x: rotatedPiece.x + offset };
            if (!collide(kickedPiece.shape, kickedPiece.x, kickedPiece.y, board)) {
                return kickedPiece; // 墙踢成功
            }
        }
        
        // 墙踢都失败，保持原状
        return piece;
    }
    
    return rotatedPiece;
};

// ============================================
// Canvas 绘制函数
// ============================================

/**
 * 绘制单个方块单元格
 * 带有立体效果（高光和阴影）
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
 * @param {number} x - 格子 X 坐标（列）
 * @param {number} y - 格子 Y 坐标（行）
 * @param {string} color - 方块颜色
 * @param {number} size - 格子大小（像素）
 */
const drawBlock = (ctx, x, y, color, size) => {
    // 绘制主体
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size - 1, size - 1);

    // 绘制顶部高光（营造立体感）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * size, y * size, size - 1, size / 4);

    // 绘制底部阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x * size, y * size + size - size / 4, size - 1, size / 4);
};

/**
 * 绘制游戏棋盘
 * 包括背景和已固定的方块
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
 * @param {Array} board - 棋盘状态（二维数组，null 表示空，字符串表示颜色）
 * @param {number} rows - 棋盘行数
 * @param {number} cols - 棋盘列数
 * @param {number} blockSize - 每个格子的大小
 */
const drawBoard = (ctx, board, rows, cols, blockSize) => {
    // 清空画布（绘制背景）
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 遍历棋盘每个格子
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (board[row][col]) {
                // 有方块，绘制方块
                drawBlock(ctx, col, row, board[row][col], blockSize);
            } else {
                // 空方格，绘制网格线
                ctx.strokeStyle = '#1a1a3e';
                ctx.strokeRect(col * blockSize, row * blockSize, blockSize, blockSize);
            }
        }
    }
};

/**
 * 绘制当前下落的方块
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
 * @param {Object} piece - 当前方块对象
 * @param {number} blockSize - 格子大小
 */
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

/**
 * 绘制下一个方块预览
 * 在信息面板中显示下一个即将出现的方块
 * 
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
 * @param {Object} nextPiece - 下一个方块对象
 * @param {number} blockSize - 预览区域的格子大小（比主棋盘小）
 */
const drawNextPiece = (ctx, nextPiece, blockSize = 20) => {
    // 清空画布
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (nextPiece) {
        const shape = nextPiece.shape;
        // 计算居中偏移量
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

// ============================================
// 游戏逻辑辅助函数
// ============================================

/** 获取所有方块类型名称 */
const getAllPieceTypes = () => Object.keys(SHAPES);

/**
 * 创建新方块
 * @param {string} type - 方块类型（I, J, L, O, S, T, Z）
 * @returns {Object} 方块对象
 */
const createPiece = (type) => ({
    type,
    shape: SHAPES[type].shape.map(row => [...row]),  // 深拷贝形状
    color: SHAPES[type].color,
    // 居中放置：棋盘宽度的一半减去方块宽度的一半
    x: Math.floor(CONSTANTS.COLS / 2) - Math.ceil(SHAPES[type].shape[0].length / 2),
    y: 0  // 从顶部开始
});

/**
 * 生成新方块
 * 将下一个方块设为当前，再随机生成新的下一个方块
 * 
 * @param {Object} nextPiece - 当前的下一个方块
 * @returns {Object} { currentPiece, nextPiece }
 */
const spawnPiece = (nextPiece) => {
    const types = getAllPieceTypes();
    const currentPiece = nextPiece || createPiece(types[Math.floor(Math.random() * types.length)]);
    const newNextPiece = createPiece(types[Math.floor(Math.random() * types.length)]);
    return { currentPiece, nextPiece: newNextPiece };
};

/**
 * 锁定方块到棋盘
 * 当方块无法继续下落时，将其固定到棋盘上
 * 
 * @param {Array} board - 当前棋盘
 * @param {Object} currentPiece - 当前方块
 * @returns {Array} 更新后的棋盘
 */
const lockPiece = (board, currentPiece) => {
    const newBoard = board.map(row => [...row]);  // 深拷贝棋盘
    
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const boardY = currentPiece.y + row;
                // 只处理在棋盘范围内的部分
                if (boardY >= 0) {
                    newBoard[boardY][currentPiece.x + col] = currentPiece.color;
                }
            }
        }
    }
    return newBoard;
};

/**
 * 检查并消除满行
 * 
 * @param {Array} board - 当前棋盘
 * @returns {Object} { newBoard, linesCleared }
 *   - newBoard: 消除后的新棋盘
 *   - linesCleared: 消除的行数（用于计分）
 */
const checkLines = (board) => {
    // 筛选出未满的行
    const newBoard = board.filter(row => !row.every(cell => cell !== null));
    const linesCleared = CONSTANTS.ROWS - newBoard.length;
    
    // 在顶部添加新的空行
    while (newBoard.length < CONSTANTS.ROWS) {
        newBoard.unshift(Array(CONSTANTS.COLS).fill(null));
    }
    
    return { newBoard, linesCleared };
};

// ============================================
// React Context 定义
// ============================================

// 创建 Context 对象
export const GameContext = createContext();

/**
 * GameProvider 组件
 * 包裹应用，提供游戏状态和方法
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子组件
 */
export function GameProvider({ children }) {
    // ========================================
    // Refs（引用）- 用于不需要触发重渲染的数据
    // ========================================
    const boardCanvasRef = useRef(null);      // 主棋盘 Canvas 引用
    const nextCanvasRef = useRef(null);       // 预览 Canvas 引用
    const dropIntervalRef = useRef(CONSTANTS.INITIAL_DROP_INTERVAL);  // 下落间隔
    const animationIdRef = useRef(null);      // 动画帧 ID（用于取消）
    const lastTimeRef = useRef(0);            // 上次下落时间戳
    const currentPieceRef = useRef(null);     // 当前方块引用（实时访问）

    // ========================================
    // State（状态）- 变化时会触发重渲染
    // ========================================
    
    /** 初始化空棋盘 */
    const initBoard = useCallback(() => {
        return Array.from({ length: CONSTANTS.ROWS }, () =>
            Array(CONSTANTS.COLS).fill(null)
        );
    }, []);

    const [board, setBoard] = useState(initBoard);           // 棋盘状态
    const [currentPiece, setCurrentPiece] = useState(null);  // 当前下落方块
    const [nextPiece, setNextPiece] = useState(null);        // 下一个方块
    const [score, setScore] = useState(0);                   // 分数
    const [level, setLevel] = useState(1);                   // 等级
    const [gameOver, setGameOver] = useState(false);         // 游戏结束标志
    const [paused, setPaused] = useState(false);             // 暂停标志

    // 同步 currentPiece 到 ref（用于游戏循环中实时访问）
    useEffect(() => {
        currentPieceRef.current = currentPiece;
    }, [currentPiece]);

    // ========================================
    // 渲染函数
    // ========================================
    
    /** 渲染主游戏画面 */
    const renderGame = useCallback(() => {
        if (!boardCanvasRef.current) return;
        const ctx = boardCanvasRef.current.getContext('2d');
        drawBoard(ctx, board, CONSTANTS.ROWS, CONSTANTS.COLS, CONSTANTS.BLOCK_SIZE);
        drawPiece(ctx, currentPieceRef.current, CONSTANTS.BLOCK_SIZE);
    }, [board]);

    /** 渲染下一个方块预览 */
    const renderNextPiece = useCallback(() => {
        if (!nextCanvasRef.current) return;
        const ctx = nextCanvasRef.current.getContext('2d');
        drawNextPiece(ctx, nextPiece, 20);
    }, [nextPiece]);

    // 当 board 或 currentPiece 变化时重绘
    useEffect(() => {
        renderGame();
    }, [renderGame]);

    // 当 nextPiece 变化时重绘预览
    useEffect(() => {
        renderNextPiece();
    }, [renderNextPiece]);

    // ========================================
    // 游戏控制函数
    // ========================================
    
    /**
     * 开始/重新开始游戏
     * 重置所有状态，生成初始方块
     */
    const startGame = useCallback(() => {
        const newBoard = initBoard();
        setBoard(newBoard);
        setScore(0);
        setLevel(1);
        dropIntervalRef.current = CONSTANTS.INITIAL_DROP_INTERVAL;
        setGameOver(false);
        setPaused(false);

        const result = spawnPiece(null);
        setNextPiece(result.nextPiece);
        setCurrentPiece(result.currentPiece);

        // 取消之前的动画帧
        if (animationIdRef.current !== null) {
            cancelAnimationFrame(animationIdRef.current);
        }
        lastTimeRef.current = performance.now();
    }, [initBoard]);

    /**
     * 暂停/继续游戏
     */
    const togglePause = useCallback(() => {
        setPaused(prev => {
            const newPaused = !prev;
            if (!newPaused && !gameOver) {
                lastTimeRef.current = performance.now();
            }
            return newPaused;
        });
    }, [gameOver]);

    // ========================================
    // 方块移动函数
    // ========================================
    
    /**
     * 下落一格
     * 如果碰撞则锁定方块并生成新方块
     * @returns {boolean} 是否锁定（用于判断是否需要生成新方块）
     */
    const moveDown = useCallback(() => {
        const piece = currentPieceRef.current;
        if (!piece) return false;

        // 检查下方是否可移动
        if (!collide(piece.shape, piece.x, piece.y + 1, board)) {
            // 可以下落，更新 Y 坐标
            const newPiece = { ...piece, y: piece.y + 1 };
            setCurrentPiece(newPiece);
            return false;
        } else {
            // 碰撞了，锁定方块
            const lockedBoard = lockPiece(board, piece);
            const { newBoard, linesCleared } = checkLines(lockedBoard);
            setBoard(newBoard);

            // 计分
            if (linesCleared > 0) {
                const points = [0, 100, 300, 500, 800];
                const newScore = score + points[linesCleared] * level;
                setScore(newScore);

                // 升级检查
                const newLevel = Math.floor(newScore / CONSTANTS.LEVEL_UP_SCORE) + 1;
                if (newLevel > level) {
                    setLevel(newLevel);
                    // 加快下落速度
                    dropIntervalRef.current = Math.max(
                        CONSTANTS.MIN_DROP_INTERVAL,
                        CONSTANTS.INITIAL_DROP_INTERVAL - (newLevel - 1) * 100
                    );
                }
            }

            // 生成新方块
            const result = spawnPiece(nextPiece);
            setNextPiece(result.nextPiece);
            setCurrentPiece(result.currentPiece);

            // 检查游戏结束（新方块生成即碰撞）
            if (collide(result.currentPiece.shape, result.currentPiece.x, result.currentPiece.y, newBoard)) {
                setGameOver(true);
            }
            return true;
        }
    }, [board, score, level, nextPiece]);

    /** 左移 */
    const moveLeft = useCallback(() => {
        const piece = currentPieceRef.current;
        if (!piece) return;
        if (!collide(piece.shape, piece.x - 1, piece.y, board)) {
            setCurrentPiece({ ...piece, x: piece.x - 1 });
        }
    }, [board]);

    /** 右移 */
    const moveRight = useCallback(() => {
        const piece = currentPieceRef.current;
        if (!piece) return;
        if (!collide(piece.shape, piece.x + 1, piece.y, board)) {
            setCurrentPiece({ ...piece, x: piece.x + 1 });
        }
    }, [board]);

    /** 旋转 */
    const rotate = useCallback(() => {
        const piece = currentPieceRef.current;
        if (!piece) return;
        const rotatedPiece = rotatePiece(piece, board);
        setCurrentPiece(rotatedPiece);
    }, [board]);

    // ========================================
    // 游戏主循环
    // ========================================
    
    /**
     * 使用 requestAnimationFrame 实现游戏循环
     * 控制方块自动下落
     */
    useEffect(() => {
        if (gameOver || paused || !currentPiece) return;

        const gameLoop = (currentTime) => {
            if (gameOver || paused) return;

            const deltaTime = currentTime - lastTimeRef.current;

            // 达到下落间隔时执行下落
            if (deltaTime >= dropIntervalRef.current) {
                moveDown();
                lastTimeRef.current = currentTime;
            }

            animationIdRef.current = requestAnimationFrame(gameLoop);
        };

        animationIdRef.current = requestAnimationFrame(gameLoop);

        // 清理函数：组件卸载时取消动画
        return () => {
            if (animationIdRef.current !== null) {
                cancelAnimationFrame(animationIdRef.current);
            }
        };
    }, [gameOver, paused, currentPiece, moveDown]);

    // ========================================
    // 键盘事件处理
    // ========================================
    
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameOver) return;

            switch (e.key) {
                case 'ArrowLeft':
                    if (!paused) moveLeft();
                    break;
                case 'ArrowRight':
                    if (!paused) moveRight();
                    break;
                case 'ArrowDown':
                    if (!paused) moveDown();
                    break;
                case 'ArrowUp':
                    if (!paused) rotate();
                    break;
                case ' ':
                    e.preventDefault();  // 防止页面滚动
                    togglePause();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        
        // 清理函数：移除事件监听
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [gameOver, paused, moveLeft, moveRight, moveDown, rotate, togglePause]);

    // ========================================
    // Context Value（提供给子组件的数据和方法）
    // ========================================
    
    const value = {
        // 状态
        board,
        currentPiece,
        nextPiece,
        score,
        level,
        gameOver,
        paused,
        // Refs（用于 Canvas 绑定）
        boardCanvasRef,
        nextCanvasRef,
        // 方法
        startGame,
        togglePause,
        renderGame,
        renderNextPiece
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

// 默认导出 GameProvider
export default GameProvider;
