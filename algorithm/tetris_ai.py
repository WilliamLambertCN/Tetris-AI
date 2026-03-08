"""
tetris_ai.py - A* 算法实现的俄罗斯方块 AI
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Set
from enum import Enum
from queue import PriorityQueue
import copy
import time

# 常量
BOARD_WIDTH = 10
BOARD_HEIGHT = 20

# 方块形状定义
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


class Action(Enum):
    """动作枚举"""
    MOVE_LEFT = "left"
    MOVE_RIGHT = "right"
    ROTATE = "rotate"
    MOVE_DOWN = "down"
    HARD_DROP = "hard_drop"
    NO_OP = "noop"


ACTION_COST = {
    Action.MOVE_LEFT: 1,
    Action.MOVE_RIGHT: 1,
    Action.ROTATE: 1,
    Action.MOVE_DOWN: 0.5,
    Action.HARD_DROP: 0,
    Action.NO_OP: 0.1
}


@dataclass
class TetrisState:
    """游戏状态"""
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
        return self.f_cost < other.f_cost
    
    def copy(self):
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
        """状态唯一键"""
        board_hash = ''.join(str(cell) for row in self.board for cell in row)
        return f"{self.piece_x},{self.piece_y},{self.rotation},{hash(board_hash) % 10000}"


def get_column_heights(board: List[List[int]]) -> List[int]:
    """获取每列高度"""
    heights = []
    for col in range(BOARD_WIDTH):
        height = 0
        for row in range(BOARD_HEIGHT):
            if board[row][col]:
                height = BOARD_HEIGHT - row
                break
        heights.append(height)
    return heights


def count_holes(board: List[List[int]]) -> int:
    """统计空洞数"""
    holes = 0
    for col in range(BOARD_WIDTH):
        filled_found = False
        for row in range(BOARD_HEIGHT):
            if board[row][col]:
                filled_found = True
            elif filled_found and board[row][col] == 0:
                holes += 1
    return holes


def get_bumpiness(heights: List[int]) -> int:
    """计算列高度差（不平整度）"""
    bumpiness = 0
    for i in range(len(heights) - 1):
        bumpiness += abs(heights[i] - heights[i + 1])
    return bumpiness


def get_aggregate_height(heights: List[int]) -> int:
    """总高度"""
    return sum(heights)


def count_complete_lines(board: List[List[int]]) -> int:
    """统计可消除的行数"""
    return sum(1 for row in board if all(row))


def simulate_place_piece(board: List[List[int]], piece_type: str, x: int, y: int, rotation: int) -> Optional[List[List[int]]]:
    """模拟放置方块，返回新棋盘或 None（如果无效）"""
    new_board = copy.deepcopy(board)
    shape = SHAPES[piece_type]['rotations'][rotation]
    
    # 检查碰撞
    for row in range(len(shape)):
        for col in range(len(shape[row])):
            if shape[row][col]:
                board_x = x + col
                board_y = y + row
                
                # 边界检查
                if board_x < 0 or board_x >= BOARD_WIDTH or board_y >= BOARD_HEIGHT:
                    return None
                
                # 碰撞检查
                if board_y >= 0 and new_board[board_y][board_x]:
                    return None
    
    # 放置方块
    for row in range(len(shape)):
        for col in range(len(shape[row])):
            if shape[row][col]:
                board_x = x + col
                board_y = y + row
                if board_y >= 0:
                    new_board[board_y][board_x] = 1
    
    return new_board


def find_drop_position(board: List[List[int]], piece_type: str, x: int, start_y: int, rotation: int) -> int:
    """找到方块的最终下落位置"""
    y = start_y
    while True:
        test_board = simulate_place_piece(board, piece_type, x, y + 1, rotation)
        if test_board is None:
            return y
        y += 1


def evaluate_board(board: List[List[int]], lines_cleared: int = 0) -> float:
    """
    评估棋盘状态
    返回分数（越高越好）
    """
    heights = get_column_heights(board)
    aggregate_height = get_aggregate_height(heights)
    bumpiness = get_bumpiness(heights)
    holes = count_holes(board)
    complete_lines = count_complete_lines(board)
    max_height = max(heights) if heights else 0
    
    # 权重（这些权重需要调优）
    # 负数表示惩罚
    score = (
        -0.51 * aggregate_height +  # 总高度惩罚
        -0.18 * bumpiness +         # 不平整惩罚
        -0.36 * holes +             # 空洞惩罚（重要）
        0.76 * complete_lines +     # 消行奖励
        -0.10 * max_height          # 最高列惩罚
    )
    
    return score


class AStarTetris:
    """A* 算法实现"""
    
    def __init__(self, max_search_time: float = 1.0):
        self.max_search_time = max_search_time
        self.node_count = 0
        self.last_search_nodes = 0
        self.last_search_time = 0
        self.last_evaluation = 0
    
    def check_collision(self, state: TetrisState) -> bool:
        """检查碰撞"""
        shape = SHAPES[state.piece_type]['rotations'][state.rotation]
        
        for row in range(len(shape)):
            for col in range(len(shape[row])):
                if shape[row][col]:
                    new_x = state.piece_x + col
                    new_y = state.piece_y + row
                    
                    if new_x < 0 or new_x >= BOARD_WIDTH or new_y >= BOARD_HEIGHT:
                        return True
                    
                    if new_y >= 0 and state.board[new_y][new_x]:
                        return True
        
        return False
    
    def is_goal_state(self, state: TetrisState) -> bool:
        """检查是否已落地"""
        test_state = state.copy()
        test_state.piece_y += 1
        return self.check_collision(test_state)
    
    def get_possible_actions(self, state: TetrisState) -> List[Action]:
        """获取可能的动作"""
        actions = [Action.MOVE_LEFT, Action.MOVE_RIGHT]
        
        # 检查是否可以旋转
        test_rotate = state.copy()
        test_rotate.rotation = (test_rotate.rotation + 1) % 4
        if not self.check_collision(test_rotate):
            actions.append(Action.ROTATE)
        
        # 检查是否可以下移
        test_down = state.copy()
        test_down.piece_y += 1
        if not self.check_collision(test_down):
            actions.append(Action.MOVE_DOWN)
        
        return actions
    
    def apply_action(self, state: TetrisState, action: Action) -> Optional[TetrisState]:
        """应用动作"""
        new_state = state.copy()
        
        if action == Action.MOVE_LEFT:
            new_state.piece_x -= 1
        elif action == Action.MOVE_RIGHT:
            new_state.piece_x += 1
        elif action == Action.ROTATE:
            new_state.rotation = (new_state.rotation + 1) % 4
        elif action == Action.MOVE_DOWN:
            new_state.piece_y += 1
        
        if self.check_collision(new_state):
            return None
        
        return new_state
    
    def reconstruct_path(self, goal_state: TetrisState) -> List[Action]:
        """重构路径"""
        actions = []
        current = goal_state
        
        while current.parent is not None and current.action is not None:
            actions.append(current.action)
            current = current.parent
        
        return list(reversed(actions))
    
    def find_best_placement(self, initial_state: TetrisState) -> List[Action]:
        """
        A* 搜索最佳放置位置
        """
        start_time = time.time()
        self.node_count = 0
        
        open_list = PriorityQueue()
        closed_set: Set[str] = set()
        
        best_goal_state = None
        best_goal_score = float('-inf')
        
        # 初始化
        initial_state.g_cost = 0
        initial_state.h_cost = 0
        initial_state.f_cost = 0
        
        counter = 0
        open_list.put((initial_state.f_cost, counter, initial_state))
        counter += 1
        
        while not open_list.empty():
            if time.time() - start_time > self.max_search_time:
                break
            
            _, _, current = open_list.get()
            self.node_count += 1
            
            # 检查是否目标状态
            if self.is_goal_state(current):
                # 评估这个位置
                final_board = simulate_place_piece(
                    current.board, 
                    current.piece_type, 
                    current.piece_x, 
                    current.piece_y, 
                    current.rotation
                )
                if final_board:
                    score = evaluate_board(final_board)
                    if score > best_goal_score:
                        best_goal_score = score
                        best_goal_state = current
                continue
            
            closed_set.add(current.get_state_key())
            
            # 生成子状态
            for action in self.get_possible_actions(current):
                child = self.apply_action(current, action)
                if child is None:
                    continue
                
                child_key = child.get_state_key()
                if child_key in closed_set:
                    continue
                
                child.g_cost = current.g_cost + ACTION_COST[action]
                child.h_cost = 0  # 简化：不使用启发函数
                child.f_cost = child.g_cost + child.h_cost
                child.parent = current
                child.action = action
                
                open_list.put((child.f_cost, counter, child))
                counter += 1
        
        self.last_search_nodes = self.node_count
        self.last_search_time = time.time() - start_time
        
        if best_goal_state:
            path = self.reconstruct_path(best_goal_state)
            path.append(Action.HARD_DROP)
            
            # 计算最终评估
            final_board = simulate_place_piece(
                best_goal_state.board,
                best_goal_state.piece_type,
                best_goal_state.piece_x,
                best_goal_state.piece_y,
                best_goal_state.rotation
            )
            if final_board:
                self.last_evaluation = evaluate_board(final_board)
            
            return path
        
        return []


def create_initial_state(board: List[List[int]], piece_type: str, piece_x: int, piece_y: int) -> TetrisState:
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
