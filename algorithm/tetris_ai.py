"""
tetris_ai.py - 俄罗斯方块 AI（简化版）

不使用 A*，而是直接枚举所有可能的放置位置，选择最优的
"""

from dataclasses import dataclass
from typing import List, Optional
from enum import Enum
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


@dataclass
class TetrisState:
    """游戏状态"""
    board: List[List[int]]
    piece_type: str
    piece_x: int
    piece_y: int
    rotation: int
    
    def copy(self):
        """复制状态"""
        return TetrisState(
            board=copy.deepcopy(self.board),
            piece_type=self.piece_type,
            piece_x=self.piece_x,
            piece_y=self.piece_y,
            rotation=self.rotation
        )


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
    """计算列高度差"""
    bumpiness = 0
    for i in range(len(heights) - 1):
        bumpiness += abs(heights[i] - heights[i + 1])
    return bumpiness


def evaluate_board(board: List[List[int]]) -> float:
    """评估棋盘状态（越高越好）"""
    heights = get_column_heights(board)
    aggregate_height = sum(heights)
    bumpiness = get_bumpiness(heights)
    holes = count_holes(board)
    complete_lines = sum(1 for row in board if all(row))
    max_height = max(heights) if heights else 0
    
    # 权重
    score = (
        -0.51 * aggregate_height +
        -0.18 * bumpiness +
        -0.36 * holes +
        0.76 * complete_lines +
        -0.10 * max_height
    )
    
    return score


def check_collision(board: List[List[int]], piece_type: str, x: int, y: int, rotation: int) -> bool:
    """检查碰撞"""
    shape = SHAPES[piece_type]['rotations'][rotation]
    
    for row in range(len(shape)):
        for col in range(len(shape[row])):
            if shape[row][col]:
                new_x = x + col
                new_y = y + row
                
                if new_x < 0 or new_x >= BOARD_WIDTH or new_y >= BOARD_HEIGHT:
                    return True
                
                if new_y >= 0 and board[new_y][new_x]:
                    return True
    
    return False


def find_drop_position(board: List[List[int]], piece_type: str, x: int, start_y: int, rotation: int) -> int:
    """找到方块下落后的 Y 位置"""
    y = start_y
    while y < BOARD_HEIGHT:
        if check_collision(board, piece_type, x, y + 1, rotation):
            return y
        y += 1
    return BOARD_HEIGHT - 1


def simulate_place(board: List[List[int]], piece_type: str, x: int, y: int, rotation: int) -> Optional[List[List[int]]]:
    """模拟放置方块，返回新棋盘"""
    if check_collision(board, piece_type, x, y, rotation):
        return None
    
    new_board = copy.deepcopy(board)
    shape = SHAPES[piece_type]['rotations'][rotation]
    
    for row in range(len(shape)):
        for col in range(len(shape[row])):
            if shape[row][col]:
                board_x = x + col
                board_y = y + row
                if 0 <= board_x < BOARD_WIDTH and 0 <= board_y < BOARD_HEIGHT:
                    new_board[board_y][board_x] = 1
    
    return new_board


def clear_lines(board: List[List[int]]) -> List[List[int]]:
    """消除满行"""
    new_board = [row for row in board if not all(row)]
    while len(new_board) < BOARD_HEIGHT:
        new_board.insert(0, [0] * BOARD_WIDTH)
    return new_board


class TetrisAI:
    """俄罗斯方块 AI - 直接枚举所有可能位置"""
    
    def __init__(self):
        self.last_search_nodes = 0
        self.last_search_time = 0
        self.last_evaluation = 0
        self.debug = False
    
    def find_best_placement(self, state: TetrisState) -> List[Action]:
        """
        找到最佳放置位置
        遍历所有可能的 x 位置和旋转角度
        """
        start_time = time.time()
        
        best_score = float('-inf')
        best_placement = None  # (x, rotation, drop_y)
        
        # 遍历所有旋转角度
        for rotation in range(4):
            # 获取方块宽度
            shape = SHAPES[state.piece_type]['rotations'][rotation]
            piece_width = len(shape[0])
            
            # 遍历所有可能的 x 位置
            for x in range(BOARD_WIDTH - piece_width + 1):
                # 找到下落位置
                drop_y = find_drop_position(state.board, state.piece_type, x, state.piece_y, rotation)
                
                # 模拟放置
                new_board = simulate_place(state.board, state.piece_type, x, drop_y, rotation)
                if new_board is None:
                    continue
                
                # 消除满行
                final_board = clear_lines(new_board)
                
                # 评估
                score = evaluate_board(final_board)
                
                if score > best_score:
                    best_score = score
                    best_placement = (x, rotation, drop_y)
        
        self.last_search_time = time.time() - start_time
        
        if best_placement is None:
            if self.debug:
                print(f"[AI] 未找到有效放置位置")
            return []
        
        target_x, target_rotation, target_y = best_placement
        
        if self.debug:
            print(f"[AI] 最佳位置: X={target_x}, Y={target_y}, 旋转={target_rotation}, 分数={best_score:.2f}")
        
        # 生成动作序列 - 简洁高效，不插入多余down
        actions = []
        current_x = state.piece_x
        current_rotation = state.rotation
        
        # 1. 旋转到目标角度
        while current_rotation != target_rotation:
            actions.append(Action.ROTATE)
            current_rotation = (current_rotation + 1) % 4
        
        # 2. 水平移动到目标位置
        while current_x < target_x:
            actions.append(Action.MOVE_RIGHT)
            current_x += 1
        while current_x > target_x:
            actions.append(Action.MOVE_LEFT)
            current_x -= 1
        
        # 3. 硬降
        actions.append(Action.HARD_DROP)
        
        self.last_evaluation = best_score
        
        return actions


def create_initial_state(board: List[List[int]], piece_type: str, piece_x: int, piece_y: int, rotation: int = 0) -> TetrisState:
    """创建初始状态"""
    return TetrisState(
        board=copy.deepcopy(board),
        piece_type=piece_type,
        piece_x=piece_x,
        piece_y=piece_y,
        rotation=rotation
    )


# 兼容旧接口
AStarTetris = TetrisAI


if __name__ == '__main__':
    # 测试
    board = [[0] * 10 for _ in range(20)]
    state = create_initial_state(board, 'T', 4, 0)
    
    ai = TetrisAI()
    ai.debug = True
    actions = ai.find_best_placement(state)
    
    print(f"动作序列: {[a.value for a in actions]}")
