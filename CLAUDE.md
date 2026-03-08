# CLAUDE.md

本文件为在仓库中与 Claude Code (claude.ai/code) 协作提供指导。

**重要规则：**
1. 每次修改都要规范使用 git 并提交到仓库
2. 每次修改都要附上修改内容总结

## 项目概览

这是一个俄罗斯方块游戏，已重构为前后端分离的 React + Node.js 架构。原单体 HTML 文件已被标准的前端组件化结构和后端 API 服务替代。

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端框架 | React 19 + Vite |
| 状态管理 | React Context + 自定义 hooks |
| HTTP 客户端 | Axios |
| 后端框架 | Node.js + Express |
| 路由 | Express Router |

## 项目结构

```
ccr_test/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── components/          # React 组件
│   │   │   └── Board/           # 游戏主棋盘组件
│   │   ├── context/             # Context 全局状态管理
│   │   │   └── GameContext.jsx  # 游戏状态 Provider
│   │   ├── utils/               # 工具函数和常量
│   │   │   └── constants.js     # 游戏配置常量 (方块形状、计分规则等)
│   │   ├── services/            # API 服务层
│   │   │   └── api.js           # Axios 封装的 API 调用
│   │   ├── App.jsx              # 主应用组件
│   │   ├── main.jsx             # 入口文件
│   │   └── index.css            # 全局样式
│   ├── public/                  # 静态资源
│   ├── package.json
│   └── vite.config.js
├── backend/                     # 后端项目
│   ├── src/
│   │   ├── routes/              # API 路由
│   │   │   ├── auth.js          # 用户认证路由
│   │   │   └── scores.js        # 排行榜路由
│   │   ├── models/              # 数据模型
│   │   │   ├── User.js          # 用户模型
│   │   │   └── Scores.js        # 分数存储模型
│   │   └── server.js            # Express 服务入口
│   ├── package.json
│   └── server.js
├── tetris.html                  # (旧版本) 已废弃的单文件版本
└── CLAUDE.md
```

## 前端架构

### GameContext (状态管理)

`src/context/GameContext.jsx` - 使用 React Context 管理游戏全局状态：

- **状态**: board, currentPiece, nextPiece, score, level, gameOver, paused
- **方法**: startGame, togglePause, moveLeft/right/down, rotate, renderBoard, renderNextPiece

### 组件树

```
App (src/App.jsx)
├── GameProvider (context wrapper)
│   └── AppContent
│       ├── Board (游戏主棋盘，从 context 读取状态并渲染)
│       └── 游戏结束遮罩层 (Game Over overlay)
```

### 游戏核心逻辑

- **碰撞检测**: `collide(pieceShape, pieceX, pieceY, board)` - 检测方块是否与边界或已有方块冲突
- **墙踢算法**: `attemptWallKick()` - 旋转失败时尝试侧向移动
- **消行计分**: `checkLines()` - 清除满行，计算分数并升级

### 游戏常量 (src/utils/constants.js)

| 常量 | 值/说明 |
|------|--------|
| COLS | 10 (列数) |
| ROWS | 20 (行数) |
| BLOCK_SIZE | 30px (方块大小) |
| SHAPES | 7 种方块定义 (I,J,L,O,S,T,Z) + 颜色 |
| POINTS | [0, 100, 300, 500, 800] - 消除 1-4 行得分 |
| LEVEL_UP_SCORE | 1000 - 升级所需分数 |

### 控制方式

- ← → : 左右移动
- ↑ : 旋转 (带墙踢)
- ↓ : 加速下落
- Space: 暂停/继续

## 后端架构

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/scores | 获取排行榜前 N 名 (query: limit) |
| POST | /api/scores | 提交分数 (body: {username, score}) |
| GET | /api/scores/user/:username | 获取用户历史成绩 |
| POST | /api/auth/register | 注册用户 (body: {username, password, email}) |
| POST | /api/auth/login | 登录用户 (body: {username, password}) |
| GET | /health | 健康检查 |

### 数据模型

- **User**: id, username, password, email
- **Score**: id(username), username, score, createdAt

## 开发命令

```bash
# ===== 前端 =====

cd frontend

# 启动开发服务器 (端口 5173)
npm run dev

# 构建生产版本
npm run build

# ESLint 检查
npm run lint

# 预览生产构建
npm run preview


# ===== 后端 =====

cd backend

# 安装依赖
npm install

# 启动开发服务器 (端口 3001)
npm start

# 使用 nodemon 热重启
npm run dev
```

## 数据流

```
游戏操作 (键盘输入)
    ↓
GameContext hooks 处理
    ↓
更新 game state (board, score, level...)
    ↓
Canvas 重渲染 (renderBoard / renderNextPiece)
    ↓
分数提交到后端 (可选 - 通过 API)
    ↓
保存到排行榜
```

## 迁移笔记

原 `tetris.html` 中的关键逻辑已迁移到：

| 原文件位置 | 新位置 |
|-----------|--------|
| tetris.html 常量定义 | src/utils/constants.js |
| tetris.html 游戏循环 | src/context/GameContext.jsx - gameLoop |
| tetris.html 碰撞检测 | src/context/GameContext.jsx - collide |
| tetris.html 旋转/墙踢 | src/context/GameContext.jsx - rotate / attemptWallKick |
| tetris.html drawBoard/drawPiece | src/context/GameContext.jsx - drawBoard / drawBlock |
