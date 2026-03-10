# AI 控制 Bug 修复计划

## Context

AI 控制俄罗斯方块时出现三个关键 bug：
1. **旋转状态不同步**：AI 计划的旋转次数和前端实际效果不匹配
2. **同类型方块检测失败**：连续相同类型方块时不生成 target 位置
3. **hard_drop 实现混乱**：AI 不发送 hard_drop，依赖 while 循环 down

## 问题分析

### Bug 1: 旋转状态不同步

**AI 端 (tetris_ai.py)**：
- 维护 `rotation` 状态 (0-3)
- I 方块：rotation=0 竖直，rotation=1 横放
- 计划：rotate 3次 → 从 rotation 0 变到 3

**前端 (GameContext.jsx)**：
- `rotatePiece()` 不追踪 rotation 状态
- 每次调用都基于当前 shape 顺时针旋转 90°
- 使用墙踢算法，可能改变 x 位置

**结果**：AI 计划旋转 N 次，但前端实际旋转结果与 AI 预期不同。

### Bug 2: 同类型方块检测失败

**当前逻辑 (run_ai.py:173-176)**：
```python
is_new_piece = (
    piece_type != self.last_piece_type or
    (piece_y <= 1 and not self.action_queue and self.last_piece_y > 5)
)
```

问题：当 `action_queue` 不为空时（上一块还在执行），新方块出现，条件不满足。

### Bug 3: hard_drop 实现混乱

**当前逻辑**：
- AI `_execute_action(HARD_DROP)` 直接 return，不发送给前端
- AI 进入 while 循环发送 `down`
- 前端有 `hard_drop` 处理但从未被调用

## 修复方案

### 方案：简化架构 - 让前端处理 hard_drop

**核心思路**：AI 只负责计算目标位置和发送动作，前端负责执行。

### 修改 1: 前端 - 移除 hard_drop 特殊处理，改为发送给前端

**文件**: `frontend/src/context/GameContext.jsx`

修改 `executeAiAction` 中 `hard_drop` case：
- 直接调用现有硬降逻辑（已经实现）
- 保持现有的一步完成落地逻辑

### 修改 2: AI 端 - 发送 hard_drop 给前端

**文件**: `algorithm/run_ai.py`

修改 `_execute_action`：
- 移除 `if action == Action.HARD_DROP: return`
- 让 hard_drop 像其他动作一样发送给前端

### 修改 3: AI 端 - 移除 while 循环下降逻辑

**文件**: `algorithm/run_ai.py`

移除 `_main_loop` 中的阶段 2（while 循环 down）：
- 简化主循环
- hard_drop 发送后直接等待新方块

### 修改 4: AI 端 - 修复同类型方块检测

**文件**: `algorithm/run_ai.py`

改进新方块检测逻辑：
- 使用更可靠的条件：检测方块 Y 位置重置到顶部
- 或者：追踪棋盘格子数变化

**建议方案**：
```python
# 检测新方块：Y 位置回到顶部 且 上次方块已经落地（action_queue 为空或刚执行完 hard_drop）
is_new_piece = (
    piece_y <= 1 and 
    (self.last_piece_y > 5 or piece_type != self.last_piece_type)
)
```

### 修改 5: 解决旋转状态同步问题

**方案 A（推荐）**：前端追踪 rotation 状态
- 在 `currentPiece` 中添加 `rotation` 字段
- 每次 rotate 更新 rotation

**方案 B**：AI 依赖前端状态
- AI 不预设旋转次数
- AI 发送 rotate 后，等待前端状态更新，检查实际形状
- 复杂度高，不推荐

**推荐方案 A**：
1. `createPiece` 时设置 `rotation: 0`
2. `rotatePiece` 时更新 `rotation: (piece.rotation + 1) % 4`
3. AI 从前端获取当前 rotation，基于此计算需要旋转多少次

## 关键文件

- `algorithm/run_ai.py` - AI 控制主循环
- `algorithm/tetris_ai.py` - AI 算法核心
- `frontend/src/context/GameContext.jsx` - 游戏状态和动作执行

## 验证方法

1. 启动后端：`cd backend && npm start`
2. 启动前端：`cd frontend && npm run dev`
3. 运行 AI：`cd algorithm && python run_ai.py`
4. 观察：
   - AI 计划的目标位置是否正确实现
   - 同类型方块是否正确处理
   - 是否还有异常消除（格子数变化不是 10 的倍数）

