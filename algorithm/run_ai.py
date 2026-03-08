"""
run_ai.py - A* AI 自动化运行脚本（带详细日志）
"""

import time
import sys
from typing import Optional
from dataclasses import dataclass

from api_client import TetrisAPI
from tetris_ai import TetrisAI, TetrisState, Action, create_initial_state, check_collision


@dataclass
class GameStats:
    """游戏统计"""
    piece_count: int = 0
    total_actions: int = 0
    total_score: int = 0
    start_time: float = 0
    
    def get_apm(self) -> float:
        if self.start_time == 0:
            return 0
        duration = time.time() - self.start_time
        return self.total_actions / duration * 60 if duration > 0 else 0


class TetrisAIController:
    """AI 游戏控制器（带详细日志）"""
    
    def __init__(self, api_base_url: str = "http://127.0.0.1:8080/api"):
        self.api = TetrisAPI(api_base_url)
        self.ai = TetrisAI()  # 使用简化版 AI
        self.ai.debug = True  # 启用调试输出
        self.stats = GameStats()
        self.last_piece_type: Optional[str] = None
        self.last_piece_y: int = -1  # 上次方块的Y位置
        self.action_queue: list[Action] = []
        self.current_piece_id = 0
        self.dropping = False  # 是否处于快速下降模式
        self.last_cell_count: int = 0  # 上次棋盘非零格数
        self.total_cells_placed: int = 0  # 总共放置的格子数
        
        # 配置日志级别
        self.verbose = True
    
    def log(self, message: str, level: str = "INFO"):
        """打印日志"""
        if not self.verbose and level == "DEBUG":
            return
        timestamp = time.strftime("%H:%M:%S", time.localtime())
        print(f"[{timestamp}] [{level}] {message}")
    
    def log_decision(self, piece_type: str, actions: List[Action], target_pos: dict, evaluation: float, search_time: float, nodes: int):
        """打印决策日志"""
        print("\n" + "=" * 60)
        print(f"🎯 决策 #{self.current_piece_id} | 方块: {piece_type}")
        print("=" * 60)
        
        # 动作序列
        action_str = " -> ".join([a.value for a in actions[:8]])
        if len(actions) > 8:
            action_str += f" ... ({len(actions)} 个动作)"
        print(f"📋 动作序列: {action_str}")
        
        # 目标位置
        print(f"📍 目标位置: X={target_pos['x']}, Y={target_pos['y']}, 旋转={target_pos['rotation']}")
        
        # 评估分数
        print(f"📊 棋盘评估分数: {evaluation:+.2f}")
        
        # 搜索统计
        print(f"🔍 搜索统计: 时间={search_time*1000:.1f}ms, 节点数={nodes}")
        print("=" * 60 + "\n")
    
    def run(self):
        """运行 AI 控制器"""
        print("=" * 60)
        print("🎮 Tetris A* AI Controller (详细日志模式)")
        print("=" * 60)
        
        # 连接服务器
        if not self.api.wait_for_server(max_wait=30):
            print("❌ 无法连接到游戏服务器!")
            print("请先启动后端: cd backend && node server.js")
            sys.exit(1)
        
        # 切换到 AI 模式
        self.log("切换到 AI 模式...")
        try:
            self.api.set_mode('AI')
            self.log("✅ AI 模式已激活")
        except Exception as e:
            self.log(f"⚠️  切换模式失败: {e}", "WARN")
        
        # 开始游戏
        self.log("开始新游戏...")
        try:
            self.api.start_game()
            self.stats.start_time = time.time()
            self.log("✅ 游戏已启动")
        except Exception as e:
            self.log(f"⚠️  启动游戏失败: {e}", "WARN")
        
        print("\n" + "=" * 60)
        print("🚀 AI 正在运行! 按 Ctrl+C 停止")
        print("=" * 60 + "\n")
        
        try:
            self._main_loop()
        except KeyboardInterrupt:
            self._stop()
    
    def _main_loop(self):
        """主游戏循环 - 动态调整，确保到达target位置"""
        
        while True:
            # 获取游戏状态
            state = self.api.get_state()
            
            if not state:
                time.sleep(0.01)
                continue
            
            # 检查游戏结束
            if state.get('gameOver'):
                self._handle_game_over(state)
                continue
            
            # 检查当前方块
            current_piece = state.get('currentPiece')
            if not current_piece:
                time.sleep(0.01)
                continue
            
            # 提取方块信息
            piece_type = current_piece.get('type')
            piece_x = current_piece.get('x', 0)
            piece_y = current_piece.get('y', 0)
            
            # 计算当前棋盘非零格数
            board = state.get('board', [])
            current_cell_count = sum(sum(row) for row in board)
            
            # 检查方块数变化是否异常
            if self.last_cell_count > 0:
                cell_diff = current_cell_count - self.last_cell_count
                
                # 正常情况下：
                # 1. 放置新方块：+4（俄罗斯方块都是4格）
                # 2. 消除整行：-10（每行10格）
                
                # 如果减少的不是10的倍数，说明有异常消除
                if cell_diff < 0 and cell_diff % 10 != 0:
                    self.log(f"ERROR: 异常消除！方块数变化: {cell_diff} (上次: {self.last_cell_count}, 本次: {current_cell_count})", "ERROR")
                    self.log(f"ERROR: 减少的格子数不是10的倍数，疑似bug！", "ERROR")
                elif cell_diff > 0 and cell_diff != 4:
                    self.log(f"WARN: 方块增加数异常: +{cell_diff} (期望+4)", "WARN")
                else:
                    # 正常情况打印INFO
                    if cell_diff != 0:
                        self.log(f"方块数变化: {self.last_cell_count} -> {current_cell_count} ({cell_diff:+d})")
            
            # 更新记录
            self.last_cell_count = current_cell_count
            
            # 检测新方块：类型变化，或(方块在顶部且没有操作flag)
            is_new_piece = (
                piece_type != self.last_piece_type or  # 类型变化
                (piece_y <= 1 and not self.dropping)  # 同类型新方块：Y在顶部且不在操作状态
            )
            
            if is_new_piece:
                # 如果是同一类型，打印提示
                if piece_type == self.last_piece_type:
                    self.log(f"检测到同类型新方块: {piece_type}")
                self._handle_new_piece(state, piece_type)
            
            # 更新上次Y位置
            self.last_piece_y = piece_y
            
            # 阶段1：执行动作，并根据实时位置动态调整
            if self.action_queue:
                # 获取队列中的下一个动作
                next_action = self.action_queue[0]
                
                # 如果是水平移动，检查是否偏离目标
                if next_action in (Action.MOVE_LEFT, Action.MOVE_RIGHT):
                    # 重新计算还需要多少步
                    remaining_actions = self._recalculate_actions(state)
                    if remaining_actions:
                        self.action_queue = remaining_actions
                        next_action = self.action_queue[0]
                
                # 执行动作
                action = self.action_queue.pop(0)
                self._execute_action(action)
                self.stats.total_actions += 1
                
                # hard_drop后，进入阶段2
                if action == Action.HARD_DROP:
                    self.dropping = True
                    self.log(f"到达目标位置 X={piece_x}，开始while循环下降")
                
                time.sleep(0.01)
                continue
            
            # 阶段2：如果在target正上方且正在下降模式，while循环down直到新方块
            if self.dropping and piece_x == self.target_x:
                self.log(f"开始while循环down，间隔0.1s")
                
                while True:
                    # 获取最新状态
                    state = self.api.get_state()
                    if not state or state.get('gameOver'):
                        break
                    
                    current_piece = state.get('currentPiece')
                    if not current_piece:
                        break
                    
                    piece_type_new = current_piece.get('type')
                    piece_y_new = current_piece.get('y', 0)
                    
                    # 检测新方块：类型变化
                    if piece_type_new != self.last_piece_type:
                        self.log(f"检测到新方块 {piece_type_new}，退出while循环")
                        break
                    
                    # 发送down加速下落
                    self._execute_action(Action.MOVE_DOWN)
                    self.stats.total_actions += 1
                    self.last_piece_y = piece_y_new
                    
                    # 间隔0.1s
                    time.sleep(0.1)
                
                self.dropping = False
            else:
                # 不在下降模式，等待
                time.sleep(0.01)
    
    def _recalculate_actions(self, state: dict) -> list:
        """根据当前位置重新计算动作"""
        current_piece = state.get('currentPiece')
        if not current_piece:
            return []
        
        current_x = current_piece.get('x', 0)
        piece_type = current_piece.get('type')
        
        # 如果还没有目标位置，返回空
        if self.target_x is None:
            return []
        
        # 重新计算从当前位置到目标位置的动作
        actions = []
        
        # 水平移动到目标位置
        while current_x < self.target_x:
            actions.append(Action.MOVE_RIGHT)
            current_x += 1
        while current_x > self.target_x:
            actions.append(Action.MOVE_LEFT)
            current_x -= 1
        
        # 添加 hard_drop
        actions.append(Action.HARD_DROP)
        
        return actions
    
    def _handle_new_piece(self, state: dict, piece_type: str):
        """处理新方块"""
        self.current_piece_id += 1
        self.stats.piece_count += 1
        self.last_piece_type = piece_type
        self.last_piece_y = state.get('currentPiece', {}).get('y', 0)
        self.action_queue = []
        self.dropping = False  # 重置下降模式
        
        # 构建初始状态
        board = state.get('board', [])
        piece_x = state.get('currentPiece', {}).get('x', 0)
        piece_y = state.get('currentPiece', {}).get('y', 0)
        
        if not board or len(board) != 20:
            self.log(f"棋盘数据异常: {len(board) if board else 'None'} 行", "ERROR")
            return
        
        # 更新当前棋盘格子数
        current_cell_count = sum(sum(row) for row in board)
        
        # 检查是否有异常（新方块出现时，格子数应该增加4）
        if self.last_cell_count > 0:
            expected_increase = 4  # 俄罗斯方块每个都是4格
            actual_change = current_cell_count - self.last_cell_count
            
            # 如果没有增加4，可能是消除或异常
            if actual_change != expected_increase and actual_change != expected_increase - 10:
                # 允许 +4 (无消除) 或 -6 (消除1行: +4-10)
                if actual_change < 0 and actual_change % 10 != (expected_increase % 10):
                    self.log(f"ERROR: 新方块出现时格子数异常！变化: {actual_change} (期望 +4 或 -6)", "ERROR")
        
        self.last_cell_count = current_cell_count
        
        # 打印初始棋盘状态
        print(f"\n{'='*60}")
        print(f"🎲 新方块 #{self.current_piece_id}: {piece_type}")
        print(f"📍 初始位置: X={piece_x}, Y={piece_y}")
        print(f"📊 当前棋盘非零格数: {current_cell_count}")
        
        # 打印完整棋盘（或底部10行）
        print("🎮 当前棋盘状态（底部10行）:")
        start_row = max(0, len(board) - 10)
        for i in range(start_row, len(board)):
            row_str = ''.join(['█' if cell else '·' for cell in board[i]])
            print(f"  Row {i:2d}: {row_str}")
        
        ai_state = create_initial_state(board, piece_type, piece_x, piece_y)
        
        # 运行 A* 搜索
        start_time = time.time()
        actions = self.ai.find_best_placement(ai_state)
        search_time = time.time() - start_time
        
        if actions:
            self.action_queue = actions
            
            # 计算目标位置
            target_pos = self._calculate_target(ai_state, actions)
            self.target_x = target_pos['x']  # 设置目标X位置
            
            print(f"[DEBUG] New actions: {[a.value for a in actions]}, target_x={self.target_x}")
            
            # 模拟放置后的棋盘
            from tetris_ai import simulate_place, clear_lines
            placed_board = simulate_place(
                ai_state.board,
                piece_type,
                target_pos['x'],
                target_pos['y'],
                target_pos['rotation']
            )
            
            if placed_board:
                final_board = clear_lines(placed_board)
                lines_cleared = sum(1 for row in placed_board if all(row))
                
                # 打印目标状态
                print(f"\n🎯 目标位置: X={target_pos['x']}, Y={target_pos['y']}, 旋转={target_pos['rotation']}")
                print(f"📋 动作序列: {' -> '.join([a.value for a in actions])}")
                print(f"📊 评估分数: {self.ai.last_evaluation:+.2f}")
                print(f"🔥 将消除行数: {lines_cleared}")
                
                # 打印放置后的棋盘（底部10行）
                print("🎮 放置后方块后的棋盘状态（底部10行）:")
                start_row = max(0, len(final_board) - 10)
                for i in range(start_row, len(final_board)):
                    row_str = ''.join(['█' if cell else '·' for cell in final_board[i]])
                    print(f"  Row {i:2d}: {row_str}")
                
                print(f"{'='*60}\n")
            
            # 上报思考状态
            self.api.report_thinking(
                is_thinking=False,
                current_piece=state.get('currentPiece'),
                target_x=target_pos['x'],
                target_y=target_pos['y'],
                target_rotation=target_pos['rotation'],
                planned_actions=[a.value for a in actions],
                search_nodes=0,
                search_time=search_time * 1000,
                evaluation_score=self.ai.last_evaluation
            )
        else:
            self.log(f"⚠️  AI 搜索失败，使用备用策略", "WARN")
            self.action_queue = [Action.HARD_DROP]
            
            self.api.report_thinking(
                is_thinking=False,
                current_piece=state.get('currentPiece'),
                planned_actions=['hard_drop']
            )
    
    def _calculate_target(self, initial_state: TetrisState, actions: List[Action]) -> dict:
        """计算目标位置"""
        state = initial_state.copy()
        
        for action in actions:
            if action == Action.MOVE_LEFT:
                state.piece_x -= 1
            elif action == Action.MOVE_RIGHT:
                state.piece_x += 1
            elif action == Action.ROTATE:
                state.rotation = (state.rotation + 1) % 4
            elif action == Action.MOVE_DOWN:
                state.piece_y += 1
            elif action == Action.HARD_DROP:
                # 硬降：一直下落直到碰撞
                while True:
                    test_y = state.piece_y + 1
                    if check_collision(state.board, state.piece_type, state.piece_x, test_y, state.rotation):
                        break
                    state.piece_y = test_y
        
        return {
            "x": state.piece_x,
            "y": state.piece_y,
            "rotation": state.rotation
        }
    
    def _adjust_actions(self, state: dict):
        """不再使用复杂调整逻辑，由主循环处理"""
        pass
    
    def _execute_action(self, action: Action):
        """执行动作"""
        try:
            self.api.send_action(action.value)
        except Exception as e:
            self.log(f"❌ 执行动作失败 {action.value}: {e}", "ERROR")
    
    def _handle_game_over(self, state: dict):
        """处理游戏结束"""
        score = state.get('score', 0)
        self.stats.total_score = score
        
        print("\n" + "=" * 60)
        print("💀 游戏结束!")
        print("=" * 60)
        print(f"📊 最终分数: {score}")
        print(f"🧩 放置方块数: {self.stats.piece_count}")
        print(f"🎮 总动作数: {self.stats.total_actions}")
        print(f"⏱️  游戏时长: {time.time() - self.stats.start_time:.1f}s")
        print(f"⚡ APM: {self.stats.get_apm():.1f}")
        print("=" * 60 + "\n")
        
        # 上报停止状态
        self.api.report_thinking(is_thinking=False)
        
        # 自动重开
        print("🔄 3秒后自动重开...")
        time.sleep(3)
        
        self.api.start_game()
        self.stats = GameStats(start_time=time.time())
        self.current_piece_id = 0
        self.last_piece_type = None
        self.action_queue = []
    
    def _stop(self):
        """停止 AI"""
        print("\n\n🛑 停止 AI 控制器...")
        
        self.api.report_thinking(is_thinking=False)
        
        try:
            self.api.set_mode('MANUAL')
            self.log("✅ 已切换回手动模式")
        except Exception as e:
            self.log(f"⚠️  切换模式失败: {e}", "WARN")
        
        print("👋 再见!")


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Tetris A* AI Controller')
    parser.add_argument(
        '--url',
        default='http://127.0.0.1:8080/api',
        help='API 基础 URL (默认: http://127.0.0.1:8080/api)'
    )
    parser.add_argument(
        '--test',
        action='store_true',
        help='测试模式'
    )
    
    args = parser.parse_args()
    
    if args.test:
        print("测试模式...")
        from tetris_ai import create_initial_state
        
        board = [[0] * 10 for _ in range(20)]
        state = create_initial_state(board, 'T', 4, 0)
        
        ai = AStarTetris()
        actions = ai.find_best_placement(state)
        
        print(f"测试结果: {[a.value for a in actions]}")
        print(f"搜索时间: {ai.last_search_time*1000:.1f}ms")
        print(f"搜索时间: {ai.last_search_time*1000:.1f}ms")
        print(f"评估分数: {ai.last_evaluation:+.2f}")
        return
    
    controller = TetrisAIController(args.url)
    controller.run()


if __name__ == '__main__':
    main()
