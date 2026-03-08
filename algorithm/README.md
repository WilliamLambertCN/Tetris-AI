# A* 俄罗斯方块 AI

基于 A* 寻路算法的俄罗斯方块自动控制器。

## 🧠 算法原理

### A* 搜索

```
f(n) = g(n) + h(n)
```

- **g(n)**: 已走步数代价
- **h(n)**: 启发函数估计值（基于 Pierre Dellacherie 算法）
- **f(n)**: 总代价，越小越好

### 启发函数指标

| 指标 | 权重 | 说明 |
|------|------|------|
| Landing Height | 1.0 | 落点高度（越低越好） |
| Eroded Cells | 1.0 | 消行贡献（奖励） |
| Row Transitions | 0.5 | 行变换次数 |
| Col Transitions | 0.5 | 列变换次数 |
| Holes | 2.0 | 空洞数（惩罚最高） |
| Well Sums | 0.5 | 井深度 |

## 📁 文件结构

```
algorithm/
├── DESIGN.md           # 详细设计文档
├── README.md           # 本文件
├── requirements.txt    # Python 依赖
├── tetris_ai.py        # A* 算法核心实现
├── api_client.py       # 后端 API 客户端
└── run_ai.py           # AI 运行入口
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd algorithm
pip install -r requirements.txt
```

### 2. 启动后端

```bash
cd ../backend
npm start
```

### 3. 启动前端

```bash
cd ../frontend
npm run dev
```

### 4. 运行 AI

```bash
cd algorithm
python run_ai.py
```

## 🎮 使用说明

### 自动模式

AI 会自动：
1. 连接到游戏后端
2. 切换到 AI 模式
3. 开始控制游戏
4. 游戏结束后自动重开

### 手动切换

在浏览器中点击 **"启用 AI"** 按钮可手动开启/关闭 AI。

### 停止 AI

在终端按 `Ctrl+C` 停止 AI 控制器。

## ⚙️ 配置

### 修改搜索时间

编辑 `run_ai.py`:

```python
self.ai = AStarTetris(max_search_time=0.5)  # 改为 1.0 搜索更久
```

### 调整启发函数权重

编辑 `tetris_ai.py`:

```python
WEIGHTS = {
    'landing_height': 1.0,
    'holes': 3.0,  # 增加对空洞的惩罚
    # ...
}
```

## 📊 预期效果

- **搜索时间**: < 100ms/步
- **消行能力**: 稳定运行 1000+ 行
- **最高分**: 预计 10,000+ 分

## 🔧 调试

### 测试模式

```bash
python run_ai.py --test
```

### 单独测试 API

```bash
python api_client.py
```

### 单独测试 A*

```python
from tetris_ai import *

board = [[0] * 10 for _ in range(20)]
state = create_initial_state(board, 'T', 4, 0)

ai = AStarTetris()
actions = ai.find_best_placement(state)
print(actions)
```

## 📚 参考

- [Pierre Dellacherie 算法](https://tetris.wiki/Pierre_Dellacherie)
- [A* Search Algorithm](https://en.wikipedia.org/wiki/A*_search_algorithm)
- [Tetris AI - StackExchange](https://gamedev.stackexchange.com/questions/40200/tetris-ai)
