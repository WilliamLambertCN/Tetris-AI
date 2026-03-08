import { createContext, useState, useEffect, useRef, useCallback } from 'react';
import * as CONSTANTS from '../utils/constants';

// 游戏常量导入
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
const rotate = (piece, board) => {
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
    piece.shape = newShape.map(row => [...row]);

    if (collide(piece.shape, piece.x, piece.y, board)) {
        piece.shape = oldShape.map(row => [...row]);
        attemptWallKick(piece, board);
    }
};

// 墙踢尝试
const attemptWallKick = (piece, board) => {
    const directions = [-1, 1, -2, 2];

    for (const direction of directions) {
        piece.x += direction;
        if (!collide(piece.shape, piece.x, piece.y, board)) {
            return;
        }
        piece.x -= direction;
    }
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
const spawnPiece = (nextPiece, createPiece) => {
    if (!nextPiece) {
        const types = Object.keys(SHAPES);
        nextPiece = createPiece(types[Math.floor(Math.random() * types.length)]);
    }

    const currentPiece = nextPiece;
    nextPiece = createPiece(types[Math.floor(Math.random() * types.length)]);

    return { currentPiece, nextPiece };
};

// 方块落定
const lockPiece = (board, currentPiece) => {
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const boardY = currentPiece.y + row;
                if (boardY >= 0) {
                    board[boardY][currentPiece.x + col] = currentPiece.color;
                }
            }
        }
    }

    checkLines(board);
};

// 消除行
const checkLines = (board, score, level, setScore, setLevel) => {
    let linesCleared = 0;

    for (let row = CONSTANTS.ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== null)) {
            board.splice(row, 1);
            board.unshift(Array(CONSTANTS.COLS).fill(null));
            linesCleared++;
            row++;
        }
    }

    if (linesCleared > 0) {
        const points = [0, 100, 300, 500, 800];
        const newScore = score + points[linesCleared] * level;
        setScore(newScore);

        const newLevel = Math.floor(newScore / CONSTANTS.LEVEL_UP_SCORE) + 1;
        setLevel(newLevel);

        const newDropInterval = Math.max(
            CONSTANTS.MIN_DROP_INTERVAL,
            CONSTANTS.INITIAL_DROP_INTERVAL - (newLevel - 1) * 100
        );
        dropIntervalRef.current = newDropInterval;
    }
};

// 组件引用
const boardCanvasRef = useRef(null);
const nextCanvasRef = useRef(null);
let dropIntervalRef = CONSTANTS.INITIAL_DROP_INTERVAL;
let animationIdRef = null;
let lastTimeRef = 0;
let isGameOverRef = false;
let isPausedRef = false;

// GameContext
const GameContext = createContext();

export function GameProvider({ children }) {
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

    // 启动游戏
    const startGame = useCallback(() => {
        const newBoard = initBoard();
        setBoard(newBoard);
        setScore(0);
        setLevel(1);
        dropIntervalRef.current = CONSTANTS.INITIAL_DROP_INTERVAL;
        setGameOver(false);
        setPaused(false);

        let nextPieceLocal = null;
        const result = spawnPiece(nextPieceLocal, createPiece);
        setNextPiece(result.nextPiece);
        setCurrentPiece(result.currentPiece);

        if (animationIdRef !== null) {
            cancelAnimationFrame(animationIdRef);
        }
        lastTimeRef = performance.now();
    }, [initBoard]);

    // 暂停游戏
    const togglePause = useCallback(() => {
        if (gameOver) return;

        setPaused(!paused);

        if (!paused && !gameOver) {
            lastTimeRef = performance.now();
            gameLoop(lastTimeRef);
        }
    }, [gameOver, paused]);

    // 移动方块
    const moveDown = useCallback((currentPieceLocal) => {
        if (!collide(currentPieceLocal.shape, currentPieceLocal.x, currentPieceLocal.y + 1, board)) {
            currentPieceLocal.y++;
            return false;
        } else {
            lockPiece(board, currentPieceLocal);
            setBoard([...board.map(row => [...row])]);
            return true;
        }
    }, [board]);

    const moveLeft = useCallback((currentPieceLocal) => {
        if (!collide(currentPieceLocal.shape, currentPieceLocal.x - 1, currentPieceLocal.y, board)) {
            currentPieceLocal.x--;
        }
    }, [board]);

    const moveRight = useCallback((currentPieceLocal) => {
        if (!collide(currentPieceLocal.shape, currentPieceLocal.x + 1, currentPieceLocal.y, board)) {
            currentPieceLocal.x++;
        }
    }, [board]);

    // 绘制当前方块
    const drawPiece = useCallback(() => {
        if (!currentPiece || !boardCanvasRef.current) return;
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    drawBlock(
                        boardCanvasRef.current.getContext('2d'),
                        currentPiece.x + col,
                        currentPiece.y + row,
                        currentPiece.color,
                        CONSTANTS.BLOCK_SIZE
                    );
                }
            }
        }
    }, [currentPiece]);

    // 游戏主循环
    const gameLoop = useCallback((currentTime) => {
        if (gameOver || paused) return;

        const deltaTime = currentTime - lastTimeRef;

        if (deltaTime >= dropIntervalRef.current) {
            moveDown(currentPiece);
            lastTimeRef = currentTime;
        }

        drawBoard(
            boardCanvasRef.current.getContext('2d'),
            board,
            CONSTANTS.ROWS,
            CONSTANTS.COLS,
            CONSTANTS.BLOCK_SIZE
        );
        drawPiece();

        animationIdRef = requestAnimationFrame(gameLoop);
    }, [board, currentPiece, gameOver, paused, moveDown, drawBoard, drawPiece]);

    // 处理键盘事件
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameOver || isGameOverRef) return;

            switch (e.key) {
                case 'ArrowLeft':
                    if (!isPausedRef) moveLeft(currentPiece);
                    break;
                case 'ArrowRight':
                    if (!isPausedRef) moveRight(currentPiece);
                    break;
                case 'ArrowDown':
                    if (!isPausedRef) moveDown(currentPiece);
                    break;
                case 'ArrowUp':
                    rotate(currentPiece, board);
                    drawPiece();
                    break;
                case ' ':
                    e.preventDefault();
                    togglePause();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [gameOver, currentPiece, board, moveLeft, moveRight, moveDown, rotate, drawPiece, togglePause]);

    // 清理动画帧
    useEffect(() => {
        return () => {
            if (animationIdRef !== null) {
                cancelAnimationFrame(animationIdRef);
            }
        };
    }, []);

    // 游戏结束检测
    useEffect(() => {
        if (currentPiece && collide(currentPiece.shape, currentPiece.x, currentPiece.y, board)) {
            setGameOver(true);
            isGameOverRef = true;
            if (animationIdRef !== null) {
                cancelAnimationFrame(animationIdRef);
            }
        }
    }, [currentPiece, board]);

    // 渲染函数
    const renderBoard = useCallback(() => {
        if (!boardCanvasRef.current || !currentPiece) return;

        drawBoard(
            boardCanvasRef.current.getContext('2d'),
            board,
            CONSTANTS.ROWS,
            CONSTANTS.COLS,
            CONSTANTS.BLOCK_SIZE
        );
        drawPiece();
    }, [board, currentPiece, drawBoard, drawPiece]);

    const renderNextPiece = useCallback(() => {
        if (!nextCanvasRef.current || !nextPiece) return;

        drawNextPiece(
            nextCanvasRef.current.getContext('2d'),
            nextPiece,
            20
        );
    }, [nextPiece]);

    // 提供状态和方法
    const value = {
        board,
        currentPiece,
        nextPiece,
        score,
        level,
        gameOver,
        paused,
        setBoard,
        setCurrentPiece,
        setNextPiece,
        setScore,
        setLevel,
        setGameOver,
        setPaused,
        startGame,
        togglePause,
        boardCanvasRef,
        nextCanvasRef,
        renderBoard,
        renderNextPiece
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

export default GameContext;
