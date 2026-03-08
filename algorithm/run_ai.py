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
        self.last_piece_id: Optional[int] = None  # 用于追踪当前方块
        self.action_queue: list[Action] = []
        self.current_piece_id = 0
        self.processing_piece = False  # 标记是否正在处理当前方块
        
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
        """主游戏循环 - 动态规划：根据实时位置调整动作"""
        debug_counter = 0
        
        while True:
            # 获取游戏状态
            state = self.api.get_state()
            
            # 调试输出（每100次循环输出一次）
            debug_counter += 1
            if debug_counter % 100 == 0:
                if state:
                    piece = state.get('currentPiece')
                    game_over = state.get('gameOver', False)
                    self.log(f"DEBUG - gameOver: {game_over}, piece: {piece.get('type') if piece else None}, queue: {len(self.action_queue)}", "DEBUG")
            
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
            
            # 检测新方块
            piece_type = current_piece.get('type')
            piece_y = current_piece.get('y', 0)
            
            # 新方块检测：类型变化，或者当前方块未处理且动作队列为空且方块在顶部
            is_new_piece = (
                piece_type != self.last_piece_type or  # 类型变化
                (not self.processing_piece and not self.action_queue and piece_y <= 2)  # 新方块且未处理
            )
            
            if is_new_piece:
                self._handle_new_piece(state, piece_type)
                self.processing_piece = True
            
            # 如果方块已经不在顶部区域，重置处理标记（表示已放置）
            if piece_y > 3:
                self.processing_piece = False
            
            # 动态调整：如果动作队列不为空，根据当前位置重新计算路径
            if self.action_queue:
                self._adjust_actions(state)
            
            # 执行动作（每次只执行一个，保持响应性）
            if self.action_queue:
                action = self.action_queue.pop(0)
                self._execute_action(action)
                self.stats.total_actions += 1
            
            # 短暂休眠，保持高频轮询
            time.sleep(0.005)
    
    def _handle_new_piece(self, state: dict, piece_type: str):
        """处理新方块"""
        # 只有真正的新方块才增加计数
        if piece_type != self.last_piece_type:
            self.current_piece_id += 1
            self.stats.piece_count += 1
        
        self.last_piece_type = piece_type
        self.action_queue = []
        
        # 构建初始状态
        board = state.get('board', [])
        piece_x = state.get('currentPiece', {}).get('x', 0)
        piece_y = state.get('currentPiece', {}).get('y', 0)
        
        if not board or len(board) != 20:
            self.log(f"棋盘数据异常: {len(board) if board else 'None'} 行", "ERROR")
            return
        
        # 打印初始棋盘状态
        print(f"\n{'='*60}")
        print(f"🎲 新方块 #{self.current_piece_id}: {piece_type}")
        print(f"📍 初始位置: X={piece_x}, Y={piece_y}")
        print(f"📊 当前棋盘非零格数: {sum(sum(row) for row in board)}")
        
        # 打印棋盘顶部几行
        print("🎮 当前棋盘顶部:")
        for i in range(min(5, len(board))):
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
                
                # 打印放置后的棋盘顶部
                print("🎮 放置后方块后的棋盘顶部:")
                for i in range(min(5, len(final_board))):
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
        """根据当前方块位置动态调整动作队列"""
        current_piece = state.get('currentPiece')
        if not current_piece or not self.action_queue:
            return
        
        # 获取当前方块状态
        current_x = current_piece.get('x', 0)
        current_y = current_piece.get('y', 0)
        current_rotation = 0  # 简化：假设前端处理旋转状态
        
        # 重建当前 AI 状态
        board = state.get('board', [])
        piece_type = current_piece.get('type')
        
        # 找到目标位置（从动作队列中提取）
        # 找到 hard_drop 之前的目标
        target_x = current_x
        target_rotation = current_rotation
        has_hard_drop = False
        
        for action in self.action_queue:
            if action == Action.HARD_DROP:
                has_hard_drop = True
                break
            elif action == Action.MOVE_LEFT:
                target_x -= 1
            elif action == Action.MOVE_RIGHT:
                target_x += 1
            elif action == Action.ROTATE:
                target_rotation = (target_rotation + 1) % 4
        
        # 如果已经有 hard_drop，不需要调整
        if not has_hard_drop:
            return
        
        # 重新生成从当前位置到目标的动作序列
        new_actions = []
        
        # 1. 旋转到目标角度
        rot = current_rotation
        while rot != target_rotation:
            new_actions.append(Action.ROTATE)
            rot = (rot + 1) % 4
        
        # 2. 水平移动到目标位置
        x = current_x
        while x < target_x:
            new_actions.append(Action.MOVE_RIGHT)
            x += 1
        while x > target_x:
            new_actions.append(Action.MOVE_LEFT)
            x -= 1
        
        # 3. 硬降
        new_actions.append(Action.HARD_DROP)
        
        # 更新动作队列
        self.action_queue = new_actions
    
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
