# CLAUDE.md

本文件为在仓库中与 Claude Code (claude.ai/code) 协作提供指导。

## 项目概览

这是一个使用原生 HTML、CSS 和 JavaScript 构建的单人文件俄罗斯方块游戏。所有游戏逻辑、样式和标记都包含在 `tetris.html` 中。

## 架构

游戏遵循经典的俄罗斯方块实现，具有以下组件：

**游戏常量（第 176-238 行）：**
- 游戏板尺寸：10 列 × 20 行
- 块大小：30px
- 七种方块类型 (I、J、L、O、S、T、Z)，具有预定义的形状和颜色

**游戏状态（第 241-250 行）：**
- `board`：表示游戏板的双向数组
- `currentPiece` / `nextPiece`：当前和排队中的方块
- `score`、`level`、`dropInterval`：游戏进度变量

**核心函数：**
| 函数 | 用途 |
|----------|---------|
| `initBoard()` | 初始化/重置游戏板 |
| `createPiece(type)` | 生成带有位置的新方块 |
| `drawBoard()` / `drawPiece()` | 渲染游戏 |
| `collide(pieceShape, pieceX, pieceY)` | 碰撞检测 |
| `rotate(piece)` | 带墙踢的旋转 |
| `lockPiece()` | 锁定放置的方块并检查消行 |
| `checkLines()` | 清除完成的行，更新分数/等级 |
| `spawnPiece()` | 排队新方块，检测游戏结束 |
| `gameLoop(currentTime)` | 主动画循环 |
| `moveLeft/right/down()` | 玩家输入处理器 |

**控制：**
- 方向键：移动和旋转
- 空格：暂停/继续

## 开发任务

要修改游戏：

1. **更改块大小或板尺寸**：编辑 `COLS`、`ROWS`、`BLOCK_SIZE` 常量（第 176-178 行）

2. **调整难度**：修改 `dropInterval` 的初始值（第 250 行）和 `checkLines()` 中的进度（第 439-441 行）

3. **更改计分**：编辑 `checkLines()` 中的点数数组（第 435 行）

4. **添加新方块类型**：使用形状矩阵和颜色扩展 `SHAPES` 对象

5. **自定义 UI**：修改第 7-134 行之间的 CSS 样式或第 136 行后的 HTML 结构

## Files

- `tetris.html`: Complete game (HTML, CSS, JavaScript)
