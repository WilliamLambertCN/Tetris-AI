"""
tetris_ai.py

A* 算法实现的俄罗斯方块 AI

@description 本模块包含：
    - State: 游戏状态定义
    - Action: 动作枚举
    - AStarTetris: A* 搜索核心算法
    - Heuristic: 启发函数实现
    - BoardMetrics: 棋盘评估指标

@usage
    from tetris_ai import AStarTetris, TetrisState
    ai = AStarTetris()
    actions = ai.find_best_placement(initial_state)
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Set
from enum import Enum
from queue import PriorityQueue
import copy
import time


# ============================================
# 常量定义
# ============================================

BOARD_WIDTH = 10
BOARD_HEIGHT = 20

# 方块形状定义（与前端一致）
SHAPES = {
    'I': {
        'rotations': [
            [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
            [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
            [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
            [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]]
        ]
    },
    'J': {
        'rotations': [
            [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
            [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
            [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
            [[0, 0, 0], [1, 1, 1], [0, 0, 1]]
        ]
    },
    'L': {
        'rotations': [
            [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
            [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
            [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
            [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
        ]
    },
    'O': {
        'rotations': [
            [[1, 1], [1, 1]],
            [[1, 1], [1, 1]],
            [[1, 1], [1, 1]],
            [[1, 1], [1, 1]]
        ]
    },
    'S': {
        'rotations': [
            [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
            [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
            [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
            [[1, 0, 0], [1, 1, 0], [0, 1, 0]]
        ]
    },
    'T': {
        'rotations': [
            [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
            [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
            [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
            [[0, 1, 0], [1, 1, 0], [0, 1, 0]]
        ]
    },
    'Z': {
        'rotations': [
            [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
            [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
            [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
            [[0, 1, 0], [1, 1, 0], [1, 0, 0]]
        ]
    }
}


# ============================================
# Action 动作定义
# ============================================

class Action(Enum):
    """可执行的动作枚举"""
    MOVE_LEFT = "left"          # 左移
    MOVE_RIGHT = "right"        # 右移
    ROTATE = "rotate"           # 旋转
    MOVE_DOWN = "down"          # 软降
    HARD_DROP = "hard_drop"     # 硬降（直接落到底）
    NO_OP = "noop"              # 无操作


# 动作代价配置
ACTION_COST = {
    Action.MOVE_LEFT: 1,
    Action.MOVE_RIGHT: 1,
    Action.ROTATE: 1,
    Action.MOVE_DOWN: 0.5,      # 软降代价较低
    Action.HARD_DROP: 0,        # 硬降代价最低
    Action.NO_OP: 0.1
}


# ============================================
# State 状态定义
# ============================================

@dataclass
class TetrisState:
    """
    游戏状态类
    
    Attributes:
        board: 10x20 二维数组，0=空，1=有方块
        piece_type: 当前方块类型 ('I', 'J', 'L', 'O', 'S', 'T', 'Z')
        piece_x: 方块 X 坐标
        piece_y: 方块 Y 坐标
        rotation: 旋转状态 (0-3)
        g_cost: 已走步数代价（A*使用）
        h_cost: 启发函数估计值（A*使用）
        f_cost: 总代价 = g + h（A*使用）
        parent: 父状态（用于路径回溯）
        action: 到达此状态的动作
    """
    board: List[List[int]]
    piece_type: str
    piece_x: int
    piece_y: int
    rotation: int
    g_cost: float = 0
    h_cost: float = 0
    f_cost: float = 0
    parent: Optional['TetrisState'] = None
    action: Optional[Action] = None
    
    def __lt__(self, other):
        """用于 PriorityQueue 比较"""
        return self.f_cost < other.f_cost
    
    def copy(self) -> 'TetrisState':
        """深拷贝状态"""
        return TetrisState(
            board=copy.deepcopy(self.board),
            piece_type=self.piece_type,
            piece_x=self.piece_x,
            piece_y=self.piece_y,
            rotation=self.rotation,
            g_cost=self.g_cost,
            h_cost=self.h_cost,
            f_cost=self.f_cost,
            parent=self.parent,
            action=self.action
        )
    
    def get_state_key(self) -> str:
        """生成状态唯一键，用于 Closed Set 去重"""
        board_hash = ''.join(str(cell) for row in self.board for cell in row)
        return f"{self.piece_x},{self.piece_y},{self.rotation},{board_hash[:20]}"


# ============================================
# 启发函数
# ============================================

class TetrisHeuristic:
    """
    俄罗斯方块启发函数
    
    基于 Pierre Dellacherie 算法，评估放置后的棋盘状态
    """
    
    # 启发函数权重（可调优）
    WEIGHTS = {
        'landing_height': 1.0,      # 落点高度
        'eroded_piece_cells': 1.0,  # 消除行中当前方块的贡献
        'row_transitions': 0.5,     # 行变换次数
        'col_transitions': 0.5,     # 列变换次数
        'holes': 2.0,               # 空洞数（权重最高）
        'well_sums': 0.5            # 井深度总和
    }
    
    @classmethod
    def evaluate(cls, state: TetrisState, original_board: Optional[List[List[int]]] = None) -> float:
        """
        评估状态，返回代价（越小越好）
        
        Args:
            state: 当前状态
            original_board: 原始棋盘（用于计算侵蚀格子数）
        
        Returns:
            评估分数（越小越好）
        """
        score = 0.0
        
        # 1. 落点高度
        landing_height = cls.get_landing_height(state)
        score += cls.WEIGHTS['landing_height'] * landing_height
        
        # 2. 侵蚀格子数
        if original_board:
            eroded = cls.get_eroded_cells(state, original_board)
            score -= cls.WEIGHTS['eroded_piece_cells'] * eroded  # 负值表示奖励
        
        # 3. 行变换
        row_trans = cls.count_row_transitions(state.board)
        score += cls.WEIGHTS['row_transitions'] * row_trans
        
        # 4. 列变换
        col_trans = cls.count_col_transitions(state.board)
        score += cls.WEIGHTS['col_transitions'] * col_trans
        
        # 5. 空洞数（最重要的惩罚项）
        holes = cls.count_holes(state.board)
        score += cls.WEIGHTS['holes'] * holes
        
        # 6. 井深度
        well_sum = cls.calculate_well_sums(state.board)
        score += cls.WEIGHTS['well_sums'] * well_sum
        
        return score
    
    @staticmethod
    def get_landing_height(state: TetrisState) -> float:
        """计算落点高度（越低越好）"""
        piece_shape = SHAPES[state.piece_type]['rotations'][state.rotation]
        piece_height = len(piece_shape)
        return state.piece_y + piece_height / 2
    
    @staticmethod
    def get_eroded_cells(state: TetrisState, original_board: List[List[int]]) -> int:
        """
        计算消除的行中，有多少格子属于当前放置的方块
        鼓励通过放置方块来消行
        """
        original_lines = sum(1 for row in original_board if all(row))
        new_lines = sum(1 for row in state.board if all(row))
        
        if new_lines <= original_lines:
            return 0
        
        # 简化的侵蚀计算：假设每消除一行，当前方块贡献 2-4 格
        return (new_lines - original_lines) * 3
    
    @staticmethod
    def count_row_transitions(board: List[List[int]]) -> int:
        """统计行变换次数（0->1 或 1->0）"""
        transitions = 0
        for row in board:
            for i in range(len(row) - 1):
                if row[i] != row[i + 1]:
                    transitions += 1
            # 边界也算变换
            if row[0] == 0:
                transitions += 1
            if row[-1] == 0:
                transitions += 1
        return transitions
    
    @staticmethod
    def count_col_transitions(board: List[List[int]]) -> int:
        """统计列变换次数"""
        transitions = 0
        for col in range(len(board[0])):
            for row in range(len(board) - 1):
                if board[row][col] != board[row + 1][col]:
                    transitions += 1
        return transitions
    
    @staticmethod
    def count_holes(board: List[List[int]]) -> int:
        """
        统计空洞数：上方有方块的空格
        这是最重要的惩罚项
        """
        holes = 0
        for col in range(len(board[0])):
            filled_found = False
            for row in range(len(board)):
                if board[row][col]:
                    filled_found = True
                elif filled_found and board[row][col] == 0:
                    holes += 1
        return holes
    
    @staticmethod
    def calculate_well_sums(board: List[List[int]]) -> float:
        """
        计算"井"的深度总和
        井是指两边都有方块的垂直空槽
        """
        well_sum = 0
        rows = len(board)
        cols = len(board[0])
        
        for col in range(cols):
            for row in range(rows):
                if board[row][col] == 0:
                    # 检查左边是否是墙或方块
                    left_filled = (col == 0) or (board[row][col - 1] == 1)
                    # 检查右边是否是墙或方块
                    right_filled = (col == cols - 1) or (board[row][col + 1] == 1)
                    
                    if left_filled and right_filled:
                        # 计算井的深度
                        depth = 0
                        for r in range(row, rows):
                            if board[r][col] == 0:
                                # 检查左右是否仍然是墙/方块
                                l_fill = (col == 0) or (board[r][col - 1] == 1)
                                r_fill = (col == cols - 1) or (board[r][col + 1] == 1)
                                if l_fill and r_fill:
                                    depth += 1
                                else:
                                    break
                            else:
                                break
                        well_sum += depth
        
        return well_sum


# ============================================
# A* 算法核心
# ============================================

class AStarTetris:
    """
    A* 算法实现的俄罗斯方块 AI
    
    搜索从初始状态到最佳落点的路径
    """
    
    def __init__(self, max_search_time: float = 0.5):
        """
        Args:
            max_search_time: 最大搜索时间（秒）
        """
        self.max_search_time = max_search_time
    
    def find_best_placement(self, initial_state: TetrisState) -> List[Action]:
        """
        A* 搜索最佳放置位置
        
        Args:
            initial_state: 初始状态
        
        Returns:
            从初始状态到最佳落点的动作序列
        """
        start_time = time.time()
        original_board = copy.deepcopy(initial_state.board)
        
        # Open List: 待探索的节点，按 f_cost 排序
        open_list: PriorityQueue[Tuple[float, int, TetrisState]] = PriorityQueue()
        
        # Closed Set: 已探索的节点
        closed_set: Set[str] = set()
        
        # 记录最佳落点
        best_goal_state: Optional[TetrisState] = None
        best_goal_score = float('inf')
        
        # 初始化
        initial_state.g_cost = 0
        initial_state.h_cost = TetrisHeuristic.evaluate(initial_state, original_board)
        initial_state.f_cost = initial_state.h_cost
        
        counter = 0  # 用于打破平局
        open_list.put((initial_state.f_cost, counter, initial_state))
        counter += 1
        
        while not open_list.empty():
            # 检查超时
            if time.time() - start_time > self.max_search_time:
                break
            
            # 取出 f_cost 最小的节点
            _, _, current = open_list.get()
            
            # 检查是否是目标状态
            if self._is_goal_state(current):
                score = TetrisHeuristic.evaluate(current, original_board)
                if score < best_goal_score:
                    best_goal_score = score
                    best_goal_state = current
                continue
            
            # 标记为已探索
            closed_set.add(current.get_state_key())
            
            # 生成子状态
            for action in self._get_possible_actions(current):
                child = self._apply_action(current, action)
                if child is None:
                    continue
                
                # 检查是否已探索
                child_key = child.get_state_key()
                if child_key in closed_set:
                    continue
                
                # 计算代价
                child.g_cost = current.g_cost + ACTION_COST[action]
                child.h_cost = TetrisHeuristic.evaluate(child, original_board)
                child.f_cost = child.g_cost + child.h_cost
                child.parent = current
                child.action = action
                
                open_list.put((child.f_cost, counter, child))
                counter += 1
        
        # 重构最优路径
        if best_goal_state:
            path = self._reconstruct_path(best_goal_state)
            # 添加硬降动作
            path.append(Action.HARD_DROP)
            return path
        
        return []
    
    def _is_goal_state(self, state: TetrisState) -> bool:
        """检查方块是否已落地"""
        # 模拟下移一格
        test_state = state.copy()
        test_state.piece_y += 1
        return self._check_collision(test_state)
    
    def _check_collision(self, state: TetrisState) -> bool:
        """检查碰撞"""
        piece_shape = SHAPES[state.piece_type]['rotations'][state.rotation]
        
        for row in range(len(piece_shape)):
            for col in range(len(piece_shape[row])):
                if piece_shape[row][col]:
                    new_x = state.piece_x + col
                    new_y = state.piece_y + row
                    
                    # 边界检查
                    if new_x < 0 or new_x >= BOARD_WIDTH or new_y >= BOARD_HEIGHT:
                        return True
                    
                    # 方块碰撞检查
                    if new_y >= 0 and state.board[new_y][new_x]:
                        return True
        
        return False
    
    def _get_possible_actions(self, state: TetrisState) -> List[Action]:
        """获取当前状态可能的动作"""
        actions = [Action.MOVE_LEFT, Action.MOVE_RIGHT, Action.ROTATE]
        
        # 检查是否可以下移
        test_down = state.copy()
        test_down.piece_y += 1
        if not self._check_collision(test_down):
            actions.append(Action.MOVE_DOWN)
        
        return actions
    
    def _apply_action(self, state: TetrisState, action: Action) -> Optional[TetrisState]:
        """应用动作，返回新状态"""
        new_state = state.copy()
        new_state.parent = state
        new_state.action = action
        
        piece_shape = SHAPES[new_state.piece_type]['rotations'][new_state.rotation]
        
        if action == Action.MOVE_LEFT:
            new_state.piece_x -= 1
            if self._check_collision(new_state):
                return None
                
        elif action == Action.MOVE_RIGHT:
            new_state.piece_x += 1
            if self._check_collision(new_state):
                return None
                
        elif action == Action.ROTATE:
            new_state.rotation = (new_state.rotation + 1) % 4
            # 墙踢：如果旋转后碰撞，尝试左右移动
            if self._check_collision(new_state):
                for offset in [-1, 1, -2, 2]:
                    kicked = new_state.copy()
                    kicked.piece_x += offset
                    if not self._check_collision(kicked):
                        return kicked
                return None
                
        elif action == Action.MOVE_DOWN:
            new_state.piece_y += 1
            if self._check_collision(new_state):
                return None
        
        return new_state
    
    def _reconstruct_path(self, goal_state: TetrisState) -> List[Action]:
        """从目标状态回溯到初始状态，重构路径"""
        actions = []
        current = goal_state
        
        while current.parent is not None and current.action is not None:
            actions.append(current.action)
            current = current.parent
        
        return list(reversed(actions))


# ============================================
# 工具函数
# ============================================

def create_initial_state(board: List[List[int]], piece_type: str, 
                         piece_x: int, piece_y: int) -> TetrisState:
    """创建初始状态"""
    return TetrisState(
        board=copy.deepcopy(board),
        piece_type=piece_type,
        piece_x=piece_x,
        piece_y=piece_y,
        rotation=0
    )


if __name__ == '__main__':
    # 测试
    board = [[0] * 10 for _ in range(20)]
    state = create_initial_state(board, 'T', 4, 0)
    
    ai = AStarTetris(max_search_time=0.5)
    actions = ai.find_best_placement(state)
    
    print(f"Best actions: {[a.value for a in actions]}")
