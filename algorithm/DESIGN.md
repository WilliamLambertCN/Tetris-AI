# A* 算法俄罗斯方块 AI 设计文档

## 1. 项目概述

本项目使用 A* (A-Star) 寻路算法实现俄罗斯方块的自动化控制，通过评估每个可能的落点，选择最优路径和放置位置。

## 2. A* 算法原理

### 2.1 核心公式

```
f(n) = g(n) + h(n)
```

- **f(n)**: 总代价估计（越小越好）
- **g(n)**: 从初始状态到当前状态的代价（已走步数）
- **h(n)**: 启发函数，估计从当前状态到目标状态的代价

### 2.2 算法流程

1. **初始化**: 将起始状态放入 Open List
2. **循环**:
   - 从 Open List 取出 f(n) 最小的节点
   - 如果到达目标（方块落地），重构路径
   - 否则生成所有可能的子状态（移动、旋转）
   - 计算每个子状态的 f(n)
   - 更新 Open List 和 Closed List
3. **执行**: 按最优路径执行动作序列

## 3. State（状态）定义

```python
@dataclass
class TetrisState:
    """游戏状态"""
    board: List[List[int]]          # 10x20 棋盘，0=空，1=有方块
    current_piece: Piece            # 当前方块（类型、位置、旋转状态）
    next_piece: Optional[Piece]     # 下一个方块（用于预判）
    piece_x: int                    # 方块 X 坐标
    piece_y: int                    # 方块 Y 坐标
    rotation: int                   # 旋转状态 (0-3)
    
    # 以下字段用于 A* 搜索
    g_cost: float = 0               # 已走步数代价
    h_cost: float = 0               # 启发函数估计值
    f_cost: float = 0               # 总代价 = g + h
    parent: Optional['TetrisState'] = None  # 父状态（用于路径回溯）
    action: Optional[Action] = None # 到达此状态的动作
```

### 3.1 状态唯一标识

用于 Closed List 去重：
```python
def state_key(state: TetrisState) -> str:
    """生成状态唯一键"""
    return f"{state.piece_x},{state.piece_y},{state.rotation},{board_hash(state.board)}"
```

## 4. Action（动作）定义

```python
from enum import Enum

class Action(Enum):
    """可执行的动作"""
    MOVE_LEFT = "left"          # 左移
    MOVE_RIGHT = "right"        # 右移
    ROTATE = "rotate"           # 旋转
    MOVE_DOWN = "down"          # 软降（加速下落）
    HARD_DROP = "hard_drop"     # 硬降（直接落到底部）
    NO_OP = "noop"              # 无操作（等待）
```

### 4.1 动作代价

```python
ACTION_COST = {
    Action.MOVE_LEFT: 1,
    Action.MOVE_RIGHT: 1,
    Action.ROTATE: 1,
    Action.MOVE_DOWN: 0.5,      # 软降代价较低，鼓励使用
    Action.HARD_DROP: 0,        # 硬降代价最低，用于最终放置
    Action.NO_OP: 0.1
}
```

## 5. Heuristic（启发函数）定义

启发函数评估一个落点的好坏，值越小越好。

### 5.1 评估指标

```python
@dataclass
class BoardMetrics:
    """棋盘评估指标"""
    aggregate_height: float     # 所有列高度之和
    complete_lines: int         # 可消除的行数
    holes: int                  # 空洞数（被方块包围的空格）
    bumpiness: float            # 列高度差（不平整度）
    max_height: int             # 最高列高度
    well_depth: float           # 井深度（适合 I 型的深槽）
```

### 5.2 Pierre Dellacherie 启发函数

基于经典的 Pierre Dellacherie 算法，权重经过调优：

```python
def heuristic(state: TetrisState) -> float:
    """
    启发函数：评估放置后的棋盘状态
    返回值越小越好
    """
    metrics = calculate_metrics(state.board)
    
    # 权重配置（可通过遗传算法调优）
    weights = {
        'landing_height': 1.0,      # 落点高度（越低越好）
        'eroded_piece_cells': 1.0,  # 消除行中属于当前方块的格子数
        'row_transitions': 0.5,     # 行变换次数（0->1 或 1->0）
        'col_transitions': 0.5,     # 列变换次数
        'holes': 2.0,               # 空洞数（权重最高）
        'well_sums': 0.5            # 井深度总和
    }
    
    score = (
        weights['landing_height'] * landing_height +
        weights['eroded_piece_cells'] * eroded_cells +
        weights['row_transitions'] * row_transitions +
        weights['col_transitions'] * col_transitions +
        weights['holes'] * metrics.holes +
        weights['well_sums'] * metrics.well_depth
    )
    
    return score
```

### 5.3 各指标详解

#### Landing Height（落点高度）
```python
def get_landing_height(state: TetrisState) -> float:
    """
    计算方块落点高度
    越低越好，防止堆太高
    """
    return state.piece_y + piece_height(state.current_piece) / 2
```

#### Eroded Piece Cells（侵蚀格子数）
```python
def get_eroded_cells(state: TetrisState, original_board: List[List[int]]) -> int:
    """
    计算消除的行中，有多少格子属于当前放置的方块
    鼓励通过放置方块来消行
    """
    new_lines = count_complete_lines(state.board) - count_complete_lines(original_board)
    if new_lines == 0:
        return 0
    
    # 计算当前方块贡献的消除格子数
    contribution = count_piece_cells_in_cleared_lines(state)
    return new_lines * contribution
```

#### Row Transitions（行变换）
```python
def count_row_transitions(board: List[List[int]]) -> int:
    """
    统计每一行中 0->1 或 1->0 的变换次数
    变换越少，形状越规整
    """
    transitions = 0
    for row in board:
        for i in range(len(row) - 1):
            if row[i] != row[i + 1]:
                transitions += 1
    return transitions
```

#### Holes（空洞）
```python
def count_holes(board: List[List[int]]) -> int:
    """
    统计空洞数：上方有方块的空格
    空洞是最需要避免的，权重最高
    """
    holes = 0
    for col in range(len(board[0])):
        filled_found = False
        for row in range(len(board)):
            if board[row][col]:
                filled_found = True
            elif filled_found and not board[row][col]:
                holes += 1
    return holes
```

#### Well Sums（井深度）
```python
def calculate_well_sums(board: List[List[int]]) -> float:
    """
    计算"井"的深度总和
    井是指两边都有方块的垂直空槽，适合放 I 型
    适当的井可以接受，但太深会有风险
    """
    well_sum = 0
    for col in range(len(board[0])):
        for row in range(len(board)):
            if is_well_cell(board, row, col):
                well_sum += calculate_well_depth(board, row, col)
    return well_sum
```

## 6. A* 搜索实现

### 6.1 主算法流程

```python
class AStarTetris:
    def find_best_placement(self, initial_state: TetrisState) -> List[Action]:
        """
        找到从初始状态到最佳落点的动作序列
        """
        open_list = PriorityQueue()  # 按 f_cost 排序
        closed_set = set()           # 已访问状态
        
        # 初始状态
        initial_state.h_cost = self.heuristic(initial_state)
        initial_state.f_cost = initial_state.h_cost
        open_list.put((initial_state.f_cost, id(initial_state), initial_state))
        
        best_goal_state = None
        best_goal_score = float('inf')
        
        while not open_list.empty():
            _, _, current = open_list.get()
            
            # 检查是否是目标状态（方块已落地）
            if self.is_goal_state(current):
                score = self.evaluate_placement(current)
                if score < best_goal_score:
                    best_goal_score = score
                    best_goal_state = current
                continue
            
            # 生成子状态
            for action in self.get_possible_actions(current):
                child = self.apply_action(current, action)
                if child is None:
                    continue
                
                state_key = self.get_state_key(child)
                if state_key in closed_set:
                    continue
                
                # 计算代价
                child.g_cost = current.g_cost + ACTION_COST[action]
                child.h_cost = self.heuristic(child)
                child.f_cost = child.g_cost + child.h_cost
                child.parent = current
                child.action = action
                
                open_list.put((child.f_cost, id(child), child))
            
            closed_set.add(self.get_state_key(current))
        
        # 重构最优路径
        if best_goal_state:
            return self.reconstruct_path(best_goal_state)
        return []
```

### 6.2 目标状态判断

```python
def is_goal_state(self, state: TetrisState) -> bool:
    """
    判断方块是否已落地（无法再下落）
    """
    # 模拟下移一格，检查是否碰撞
    test_state = copy_state(state)
    test_state.piece_y += 1
    return self.check_collision(test_state)
```

### 6.3 路径重构

```python
def reconstruct_path(self, goal_state: TetrisState) -> List[Action]:
    """
    从目标状态回溯到初始状态，得到动作序列
    """
    actions = []
    current = goal_state
    
    while current.parent is not None:
        if current.action:
            actions.append(current.action)
        current = current.parent
    
    return list(reversed(actions))
```

## 7. 实时控制流程

```
┌─────────────────┐
│   游戏开始      │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 获取游戏状态    │◄────────────────────┐
│ (board, piece)  │                     │
└────────┬────────┘                     │
         ▼                              │
┌─────────────────┐     执行失败        │
│ A* 搜索最优路径 │─────────────────────┘
│ (actions[])     │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 依次执行动作    │
│ (左/右/旋转/降) │
└────────┬────────┘
         ▼
┌─────────────────┐
│   方块落地      │
└────────┬────────┘
         ▼
    ┌─────────┐
    │ 下一方块│
    └────┬────┘
         └──────────────► 获取游戏状态
```

## 8. API 设计

### 8.1 后端接口

```
GET  /api/ai/state           # 获取当前游戏状态
POST /api/ai/action          # 执行动作
POST /api/ai/start           # 开始新游戏
POST /api/ai/reset           # 重置游戏
GET  /api/ai/mode            # 获取当前模式（AI/MANUAL）
POST /api/ai/mode            # 切换模式
```

### 8.2 状态响应格式

```json
{
  "board": [[0,0,0,...], ...],      // 10x20 二维数组
  "currentPiece": {
    "type": "T",
    "x": 5,
    "y": 2,
    "rotation": 0,
    "shape": [[0,1,0], [1,1,1], [0,0,0]]
  },
  "nextPiece": {
    "type": "I",
    "shape": [[0,1,0,0], ...]
  },
  "score": 1200,
  "level": 2,
  "gameOver": false
}
```

### 8.3 动作请求格式

```json
{
  "action": "left" | "right" | "rotate" | "down" | "hard_drop"
}
```

## 9. 性能优化

### 9.1 搜索剪枝

- **最大搜索深度**: 限制 A* 搜索深度，避免过度计算
- **时间限制**: 单次搜索不超过 100ms
- **对称性剪枝**: 相同旋转状态的等价位置只保留一个

### 9.2 权重调优

使用遗传算法或模拟退火调优启发函数权重：

```python
def genetic_optimize():
    """遗传算法优化权重"""
    population = generate_initial_population()
    for generation in range(MAX_GENERATIONS):
        scores = [evaluate_weights(w) for w in population]
        parents = select_parents(population, scores)
        population = crossover_and_mutate(parents)
    return best_weights
```

## 10. 预期效果

根据 Pierre Dellacherie 算法的 benchmark：
- **平均消行**: 500,000+ 行
- **最高分**: 可达数百万
- **实时性**: 每步决策 < 50ms

本实现目标：
- 稳定运行 10,000+ 行
- 最高冲击 100,000+ 分
- 决策延迟 < 100ms
