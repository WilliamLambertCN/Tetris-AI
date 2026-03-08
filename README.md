# 俄罗斯方块 (Tetris)

一个使用 React + Node.js 开发的现代化俄罗斯方块游戏。

## 🎮 项目概览

本项目是一个前后端分离的俄罗斯方块游戏，前端使用 React 19 和 HTML5 Canvas 实现游戏画面，后端提供 REST API 支持排行榜功能。

### 功能特性

- ✅ 完整的俄罗斯方块核心玩法
- ✅ 7 种标准方块（I, J, L, O, S, T, Z）
- ✅ 碰撞检测和墙踢（Wall Kick）
- ✅ 消行计分和等级系统
- ✅ 键盘控制（方向键 + 空格）
- ✅ 暂停/继续功能
- ✅ 游戏结束判定
- ✅ 下一个方块预览
- 🚧 排行榜 API（后端已就绪）

## 🏗️ 技术栈

| 层次 | 技术 |
|------|------|
| 前端框架 | React 19 + Vite |
| 状态管理 | React Context API |
| 绘图 | HTML5 Canvas API |
| HTTP 客户端 | Axios |
| 后端框架 | Node.js + Express |
| 跨域 | CORS |

## 📁 项目结构

```
ccr_test/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── components/          # React 组件
│   │   │   └── Board/           # 游戏主界面
│   │   │       └── Board.jsx    # 棋盘 + 信息面板
│   │   ├── context/             # 全局状态管理
│   │   │   └── GameContext.jsx  # 游戏核心逻辑 ⭐
│   │   ├── utils/               # 工具函数
│   │   │   └── constants.js     # 游戏常量配置
│   │   ├── services/            # API 服务层
│   │   │   └── api.js           # 后端接口封装
│   │   ├── App.jsx              # 应用根组件
│   │   ├── main.jsx             # 入口文件
│   │   └── index.css            # 全局样式
│   ├── public/                  # 静态资源
│   └── package.json
│
├── backend/                     # 后端项目
│   ├── routes/
│   │   ├── auth.js              # 用户认证路由
│   │   └── scores.js            # 排行榜路由
│   ├── models/
│   │   ├── User.js              # 用户模型
│   │   └── Scores.js            # 分数存储模型
│   ├── server.js                # Express 入口
│   └── package.json
│
├── tetris.html                  # 旧版本（单文件，已废弃）
├── CLAUDE.md                    # 项目开发文档
└── README.md                    # 本文件
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 启动开发服务器

```bash
# 后端（默认端口 3001，可在环境变量 PORT 中修改）
cd backend
npm start

# 或热重启模式
npm run dev

# 前端（默认端口 5173）
cd frontend
npm run dev
```

### 访问游戏

浏览器打开：`http://localhost:5173`

## 🎮 游戏操作

| 按键 | 功能 |
|------|------|
| ← (左箭头) | 左移方块 |
| → (右箭头) | 右移方块 |
| ↓ (下箭头) | 加速下落 |
| ↑ (上箭头) | 旋转方块 |
| 空格 | 暂停/继续 |

## 📝 新同事开发指南

### 1. 理解 React Context

本项目使用 **React Context API** 进行状态管理，所有游戏状态集中在 `GameContext.jsx` 中。

```javascript
// 在组件中获取游戏状态
import { useContext } from 'react';
import GameContext from './context/GameContext';

function MyComponent() {
    const { score, level, gameOver, startGame } = useContext(GameContext);
    // ...
}
```

### 2. 核心文件说明

#### `GameContext.jsx`（必读 ⭐）

游戏的核心逻辑都在这个文件中：

| 部分 | 说明 |
|------|------|
| SHAPES | 7种方块的形状和颜色定义 |
| collide() | 碰撞检测函数 |
| rotatePiece() | 旋转 + 墙踢算法 |
| drawBoard/drawPiece | Canvas 绘制函数 |
| GameProvider | 状态管理组件 |

**关键概念：**
- **State**: React 状态，变化会触发重渲染（如 `score`, `board`）
- **Ref**: 引用，不会触发重渲染，用于实时访问数据（如 `currentPieceRef`）
- **游戏循环**: 使用 `requestAnimationFrame` 实现自动下落

#### `Board.jsx`

纯展示组件，只负责渲染 UI，不处理游戏逻辑。

#### `constants.js`

所有游戏参数都在这里配置，修改这里可以改变游戏难度。

### 3. 添加新功能的步骤

以"添加音效"为例：

```javascript
// 1. 在 GameContext.jsx 中添加状态
const [soundEnabled, setSoundEnabled] = useState(true);

// 2. 在消行/游戏结束等事件触发音效
const playSound = (type) => {
    if (!soundEnabled) return;
    // 播放音效...
};

// 3. 在 value 中暴露给子组件
const value = { ..., soundEnabled, setSoundEnabled };

// 4. 在 Board.jsx 中添加开关按钮
const { soundEnabled, setSoundEnabled } = useContext(GameContext);
<button onClick={() => setSoundEnabled(!soundEnabled)}>
    {soundEnabled ? '🔊' : '🔇'}
</button>
```

### 4. 后端 API 说明

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/scores?limit=10` | 获取排行榜 |
| POST | `/api/scores` | 提交分数 |
| GET | `/api/scores/user/:name` | 获取用户历史 |
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/health` | 健康检查 |

### 5. 代码规范

- 使用 **JSDoc** 注释函数和组件
- 常量使用 UPPER_SNAKE_CASE
- 组件使用 PascalCase
- 普通函数使用 camelCase

## 🔧 常见问题

### 端口被占用

```bash
# Windows 查看占用
netstat -ano | findstr :3001

# 修改后端端口
$env:PORT=3002  # PowerShell
PORT=3002 npm start  # Linux/Mac
```

### 依赖安装失败

```bash
# 清理缓存后重试
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 📜 许可

MIT License
