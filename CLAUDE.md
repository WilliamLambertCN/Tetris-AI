# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**重要规则：**
1. 每次修改都要规范使用 git 并提交到仓库
2. 每次修改都要附上修改内容总结

## 项目概览

俄罗斯方块游戏 + A* AI 自动控制，前后端分离架构。前端 React + Canvas 渲染游戏，后端 Express 提供 API，Python AI 通过轮询实现自动控制。

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端框架 | React 19 + Vite |
| 状态管理 | React Context |
| 绘图 | HTML5 Canvas API |
| HTTP 客户端 | Axios |
| 后端框架 | Node.js + Express |
| AI 算法 | Python + 枚举搜索 + 启发式评估 |

## 项目结构

```
├── frontend/src/
│   ├── context/GameContext.jsx   # 游戏核心逻辑 ⭐
│   ├── services/aiApi.js         # AI 控制接口
│   └── utils/constants.js        # 游戏常量
├── backend/
│   ├── server.js                 # Express 入口 (端口 8080)
│   └── routes/ai.js              # AI 控制路由 ⭐
├── algorithm/
│   ├── tetris_ai.py              # AI 核心算法 ⭐
│   ├── api_client.py             # 后端 API 客户端
│   └── run_ai.py                 # AI 运行入口
└── tetris.html                   # (废弃) 旧单文件版本
```

## 前端架构 (GameContext.jsx)

核心状态: board, currentPiece, nextPiece, score, level, gameOver, paused, aiMode

关键函数:
- `collide()` - 碰撞检测
- `rotatePiece()` - 旋转 + 墙踢算法
- `checkLines()` - 消行计分
- `executeAiAction()` - 执行 AI 动作，hard_drop 使用 boardRef 一次性完成落地逻辑

控制: ← → 移动 / ↑ 旋转 / ↓ 加速 / Space 暂停

## AI 架构 (algorithm/)

### 通信机制
```
前端 (20ms 轮询) ─→ POST /api/ai/state ─→ 后端 ─← GET /api/ai/state ─← AI Python
前端 (20ms 轮询) ←─ GET /api/ai/action ─── 后端 ←─ POST /api/ai/action ── AI Python
```

### 核心文件

**tetris_ai.py** - AI 核心算法:
- `TetrisAI.find_best_placement(state)` - 枚举所有 x 位置 + 旋转角度，选择最优放置
- `evaluate_board(board)` - 启发式评估: 高度、空洞、平整度、消行

**run_ai.py** - AI 控制器:
- `TetrisAIController` - 主循环，新方块检测，动作队列执行
- 动作: left/right/rotate/down/hard_drop

### AI 启动

```bash
# 1. 启动后端
cd backend && npm start

# 2. 启动前端
cd frontend && npm run dev

# 3. 运行 AI
cd algorithm && pip install -r requirements.txt && python run_ai.py

# 测试 AI 算法
python run_ai.py --test
```

## 后端 API (端口 8080)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/state | 前端上报游戏状态 |
| GET | /api/ai/state | AI 获取游戏状态 |
| POST | /api/ai/action | AI 发送动作指令 |
| GET | /api/ai/action | 前端获取待执行动作 |
| POST | /api/ai/mode | 切换 AI/MANUAL 模式 |
| POST | /api/ai/thinking | AI 上报思考状态（可视化） |
| GET | /api/ai/thinking | 前端获取 AI 思考状态 |
| GET | /health | 健康检查 |

## 开发命令

```bash
# 前端 (端口 5173)
cd frontend && npm run dev

# 后端 (端口 8080)
cd backend && npm start

# AI 测试
cd algorithm && python run_ai.py --test
```

## 数据流

```
游戏操作 ─→ GameContext 更新状态 ─→ Canvas 重渲染
         ─→ POST /api/ai/state ─→ 后端缓存
                                   ↓
AI Python ←─ GET /api/ai/state ←──┘
AI 计算最优放置 ─→ POST /api/ai/action ─→ 后端队列
                                          ↓
前端 ←─ GET /api/ai/action ←──────────────┘
前端 executeAiAction() 执行
```
