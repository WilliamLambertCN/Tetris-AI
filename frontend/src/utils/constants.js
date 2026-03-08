// 游戏常量

export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30;

// 方块形状定义
export const SHAPES = {
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

// 计分规则
export const POINTS = [0, 100, 300, 500, 800];

// 等级提升分数间隔
export const LEVEL_UP_SCORE = 1000;

// 初始下落间隔 (毫秒)
export const INITIAL_DROP_INTERVAL = 1000;

// 最小下落间隔 (毫秒)
export const MIN_DROP_INTERVAL = 100;
