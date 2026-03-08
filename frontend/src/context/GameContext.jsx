import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import * as CONSTANTS from '../utils/constants';

// 游戏常量
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

// 碰撞检测
const collide = (pieceShape, pieceX, pieceY, board) => {
    for (let row = 0; row < pieceShape.length; row++) {
        for (let col = 0; col < pieceShape[row].length; col++) {
            if (pieceShape[row][col]) {
                const newX = pieceX + col;
                const newY = pieceY + row;

                if (newX < 0 || newX >= CONSTANTS.COLS || newY >= CONSTANTS.ROWS) {
                    return true;
                }

                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
};

// 旋转方块
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

    const oldShape = piece.shape;
    const newPiece = { ...piece, shape: newShape.map(row => [...row]) };

    if (collide(newPiece.shape, newPiece.x, newPiece.y, board)) {
        // 墙踢尝试
        const directions = [-1, 1, -2, 2];
        for (const direction of directions) {
            const kickedPiece = { ...newPiece, x: newPiece.x + direction };
            if (!collide(kickedPiece.shape, kickedPiece.x, kickedPiece.y, board)) {
                return kickedPiece;
            }
        }
        return { ...piece, shape: oldShape.map(row => [...row]) };
    }
    return newPiece;
};

// 绘制方块单元
const drawBlock = (ctx, x, y, color, size) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * size, y * size, size - 1, size - 1);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * size, y * size, size - 1, size / 4);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x * size, y * size + size - size / 4, size - 1, size / 4);
};

// 绘制游戏面板
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

// 绘制当前方块
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

// 绘制下一个方块预览
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

// 获取所有方块类型
const getAllPieceTypes = () => Object.keys(SHAPES);

// 创建新方块
const createPiece = (type) => {
    return {
        type,
        shape: SHAPES[type].shape.map(row => [...row]),
        color: SHAPES[type].color,
        x: Math.floor(CONSTANTS.COLS / 2) - Math.ceil(SHAPES[type].shape[0].length / 2),
        y: 0
    };
};

// 生成新方块
const spawnPiece = (nextPiece) => {
    const types = getAllPieceTypes();
    const currentPiece = nextPiece || createPiece(types[Math.floor(Math.random() * types.length)]);
    const newNextPiece = createPiece(types[Math.floor(Math.random() * types.length)]);
    return { currentPiece, nextPiece: newNextPiece };
};

// 方块落定
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

// 消除行
const checkLines = (board) => {
    let linesCleared = 0;
    const newBoard = board.filter(row => !row.every(cell => cell !== null));
    linesCleared = CONSTANTS.ROWS - newBoard.length;
    
    while (newBoard.length < CONSTANTS.ROWS) {
        newBoard.unshift(Array(CONSTANTS.COLS).fill(null));
    }
    
    return { newBoard, linesCleared };
};

// GameContext
export const GameContext = createContext();

export function GameProvider({ children }) {
    const boardCanvasRef = useRef(null);
    const nextCanvasRef = useRef(null);
    const dropIntervalRef = useRef(CONSTANTS.INITIAL_DROP_INTERVAL);
    const animationIdRef = useRef(null);
    const lastTimeRef = useRef(0);
    const currentPieceRef = useRef(null);

    // 初始化游戏板
    const initBoard = useCallback(() => {
        return Array.from({ length: CONSTANTS.ROWS }, () =>
            Array(CONSTANTS.COLS).fill(null)
        );
    }, []);

    // 游戏状态
    const [board, setBoard] = useState(initBoard);
    const [currentPiece, setCurrentPiece] = useState(null);
    const [nextPiece, setNextPiece] = useState(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [paused, setPaused] = useState(false);

    // 更新当前方块引用
    useEffect(() => {
        currentPieceRef.current = currentPiece;
    }, [currentPiece]);

    // 渲染游戏面板
    const renderGame = useCallback(() => {
        if (!boardCanvasRef.current) return;
        const ctx = boardCanvasRef.current.getContext('2d');
        drawBoard(ctx, board, CONSTANTS.ROWS, CONSTANTS.COLS, CONSTANTS.BLOCK_SIZE);
        drawPiece(ctx, currentPieceRef.current, CONSTANTS.BLOCK_SIZE);
    }, [board]);

    // 渲染下一个方块
    const renderNextPiece = useCallback(() => {
        if (!nextCanvasRef.current) return;
        const ctx = nextCanvasRef.current.getContext('2d');
        drawNextPiece(ctx, nextPiece, 20);
    }, [nextPiece]);

    // 渲染
    useEffect(() => {
        renderGame();
    }, [renderGame]);

    useEffect(() => {
        renderNextPiece();
    }, [renderNextPiece]);

    // 启动游戏
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

        if (animationIdRef.current !== null) {
            cancelAnimationFrame(animationIdRef.current);
        }
        lastTimeRef.current = performance.now();
    }, [initBoard]);

    // 暂停游戏
    const togglePause = useCallback(() => {
        setPaused(prev => {
            const newPaused = !prev;
            if (!newPaused && !gameOver) {
                lastTimeRef.current = performance.now();
            }
            return newPaused;
        });
    }, [gameOver]);

    // 移动方块
    const moveDown = useCallback(() => {
        const piece = currentPieceRef.current;
        if (!piece) return false;

        if (!collide(piece.shape, piece.x, piece.y + 1, board)) {
            const newPiece = { ...piece, y: piece.y + 1 };
            setCurrentPiece(newPiece);
            return false;
        } else {
            // 锁定方块
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

            // 生成新方块
            const result = spawnPiece(nextPiece);
            setNextPiece(result.nextPiece);
            setCurrentPiece(result.currentPiece);

            // 检查游戏结束
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

    // 游戏主循环
    useEffect(() => {
        if (gameOver || paused || !currentPiece) return;

        const gameLoop = (currentTime) => {
            if (gameOver || paused) return;

            const deltaTime = currentTime - lastTimeRef.current;

            if (deltaTime >= dropIntervalRef.current) {
                moveDown();
                lastTimeRef.current = currentTime;
            }

            animationIdRef.current = requestAnimationFrame(gameLoop);
        };

        animationIdRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (animationIdRef.current !== null) {
                cancelAnimationFrame(animationIdRef.current);
            }
        };
    }, [gameOver, paused, currentPiece, moveDown]);

    // 处理键盘事件
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
                    e.preventDefault();
                    togglePause();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [gameOver, paused, moveLeft, moveRight, moveDown, rotate, togglePause]);

    // 提供状态和方法
    const value = {
        board,
        currentPiece,
        nextPiece,
        score,
        level,
        gameOver,
        paused,
        boardCanvasRef,
        nextCanvasRef,
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

export default GameContext;
