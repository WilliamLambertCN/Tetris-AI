import { useState, useEffect, useCallback, useRef } from 'react';
import * as CONSTANTS from '../utils/constants';

// 碰撞检测
const collide = (pieceShape, pieceX, pieceY) => {
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
const rotate = (piece) => {
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

    if (collide(piece.shape, piece.x, piece.y)) {
        piece.shape = oldShape.map(row => [...row]);
        attemptWallKick(piece);
    }
};

// 墙踢尝试
const attemptWallKick = (piece) => {
    const directions = [-1, 1, -2, 2];

    for (const direction of directions) {
        piece.x += direction;
        if (!collide(piece.shape, piece.x, piece.y)) {
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

// 游戏状态管理器
export function useGameLogic() {
    // 初始化游戏板
    const initBoard = useCallback(() => {
        return Array.from({ length: CONSTANTS.ROWS }, () =>
            Array(CONSTANTS.COLS).fill(null)
        );
    }, []);

    // 创建新方块
    const createPiece = useCallback((type) => {
        return {
            type,
            shape: SHAPES[type].shape.map(row => [...row]),
            color: SHAPES[type].color,
            x: Math.floor(CONSTANTS.COLS / 2) - Math.ceil(SHAPES[type].shape[0].length / 2),
            y: 0
        };
    }, []);

    // 绘制下一个方块预览
    const drawNextPiece = useCallback((ctx, nextPiece, blockSize = 20) => {
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
    }, []);

    // 方块落定
    const lockPiece = useCallback((board, currentPiece) => {
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
        return spawnPiece(nextPiece, setNextPiece, createPiece);
    }, [createPiece]);

    // 消除行
    const checkLines = useCallback((board) => {
        let linesCleared = 0;

        for (let row = CONSTANTS.ROWS - 1; row >= 0; row--) {
            if (board[row].every(cell => cell !== null)) {
                board.splice(row, 1);
                board.unshift(Array(CONSTANTS.COLS).fill(null));
                linesCleared++;
                row++;
            }
        }

        return linesCleared;
    }, []);

    // 生成新方块
    const spawnPiece = useCallback((nextPiece, setNextPiece, createPiece) => {
        if (!nextPiece) {
            nextPiece = createPiece(Object.keys(SHAPES)[Math.floor(Math.random() * Object.keys(SHAPES).length)]);
        }

        const currentPiece = nextPiece;
        nextPiece = createPiece(Object.keys(SHAPES)[Math.floor(Math.random() * Object.keys(SHAPES).length)]);

        drawNextPiece(nextCanvasRef.current, nextPiece);

        if (collide(currentPiece.shape, currentPiece.x, currentPiece.y)) {
            return { gameOver: true };
        }

        setCurrentPiece(currentPiece);
        return { gameOver: false };
    }, [nextPiece, createPiece]);

    // 移动方块
    const moveDown = useCallback((currentPiece) => {
        if (!collide(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
            currentPiece.y++;
            return false;
        } else {
            lockPiece(board, currentPiece);
            return true;
        }
    }, [board, lockPiece]);

    const moveLeft = useCallback((currentPiece) => {
        if (!collide(currentPiece.shape, currentPiece.x - 1, currentPiece.y)) {
            currentPiece.x--;
        }
    }, []);

    const moveRight = useCallback((currentPiece) => {
        if (!collide(currentPiece.shape, currentPiece.x + 1, currentPiece.y)) {
            currentPiece.x++;
        }
    }, []);

    // 组件引用
    const boardCanvasRef = useRef(null);
    const nextCanvasRef = useRef(null);

    // 游戏状态
    const [board, setBoard] = useState(initBoard);
    const [currentPiece, setCurrentPiece] = useState(null);
    const [nextPiece, setNextPiece] = useState(null);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [paused, setPaused] = useState(false);
    const [animationId, setAnimationId] = useState(null);
    const lastTimeRef = useRef(0);
    const dropIntervalRef = useRef(CONSTANTS.INITIAL_DROP_INTERVAL);

    // 启动游戏
    const startGame = useCallback(() => {
        const newBoard = initBoard();
        setBoard(newBoard);
        setScore(0);
        setLevel(1);
        dropIntervalRef.current = CONSTANTS.INITIAL_DROP_INTERVAL;
        setGameOver(false);
        setPaused(false);

        nextPiece = null;
        spawnPiece(null, setNextPiece, createPiece);
        lastTimeRef.current = performance.now();

        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    }, [initBoard, createPiece]);

    // 暂停游戏
    const togglePause = useCallback(() => {
        if (gameOver) return;

        setPaused(!paused);

        if (!paused) {
            lastTimeRef.current = performance.now();
            gameLoop(lastTimeRef.current);
        }
    }, [gameOver, paused]);

    // 游戏主循环
    const gameLoop = useCallback((currentTime) => {
        if (gameOver || paused) return;

        const deltaTime = currentTime - lastTimeRef.current;

        if (deltaTime >= dropIntervalRef.current) {
            moveDown(currentPiece);
            lastTimeRef.current = currentTime;
        }

        drawBoard(boardCanvasRef.current, board, CONSTANTS.ROWS, CONSTANTS.COLS, CONSTANTS.BLOCK_SIZE);
        drawPiece();

        setAnimationId(requestAnimationFrame(gameLoop));
    }, [board, currentPiece, gameOver, paused, moveDown]);

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

    // 处理键盘事件
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameOver) return;

            switch (e.key) {
                case 'ArrowLeft':
                    moveLeft(currentPiece);
                    break;
                case 'ArrowRight':
                    moveRight(currentPiece);
                    break;
                case 'ArrowDown':
                    moveDown(currentPiece);
                    break;
                case 'ArrowUp':
                    rotate(currentPiece);
                    drawBoard(boardCanvasRef.current, board, CONSTANTS.ROWS, CONSTANTS.COLS, CONSTANTS.BLOCK_SIZE);
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
    }, [currentPiece, gameOver, moveLeft, moveRight, moveDown, rotate, board, drawBoard, drawPiece, togglePause]);

    // 清理动画帧
    useEffect(() => {
        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [animationId]);

    return {
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
        nextCanvasRef
    };
}
