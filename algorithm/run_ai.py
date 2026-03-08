"""
run_ai.py - A* AI 自动化运行脚本（带详细日志）
"""

import time
import sys
from typing import Optional
from dataclasses import dataclass

from api_client import TetrisAPI
from tetris_ai import TetrisAI, TetrisState, Action, create_initial_state


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
        self.action_queue: list[Action] = []
        self.current_piece_id = 0
        
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
        """主游戏循环"""
        debug_counter = 0
        
        while True:
            # 获取游戏状态
            state = self.api.get_state()
            
            # 调试输出（每50次循环输出一次）
            debug_counter += 1
            if debug_counter % 50 == 0:
                if state:
                    piece = state.get('currentPiece')
                    game_over = state.get('gameOver', False)
                    self.log(f"DEBUG - gameOver: {game_over}, piece: {piece.get('type') if piece else None}", "DEBUG")
                else:
                    self.log("DEBUG - No state received", "DEBUG")
            
            if not state:
                time.sleep(0.05)
                continue
            
            # 检查游戏结束
            if state.get('gameOver'):
                self._handle_game_over(state)
                continue
            
            # 检查当前方块
            current_piece = state.get('currentPiece')
            if not current_piece:
                time.sleep(0.05)
                continue
            
            # 检测新方块（通过类型变化或动作队列为空）
            piece_type = current_piece.get('type')
            if piece_type != self.last_piece_type or (not self.action_queue and not self.last_piece_type):
                self._handle_new_piece(state, piece_type)
            
            # 执行动作
            if self.action_queue:
                action = self.action_queue.pop(0)
                self._execute_action(action)
                self.stats.total_actions += 1
            
            time.sleep(0.03)  # 30ms 执行间隔
    
    def _handle_new_piece(self, state: dict, piece_type: str):
        """处理新方块"""
        self.last_piece_type = piece_type
        self.current_piece_id += 1
        self.stats.piece_count += 1
        self.action_queue = []
        
        self.log(f"新方块 #{self.current_piece_id}: {piece_type}")
        
        # 构建初始状态
        board = state.get('board', [])
        piece_x = state.get('currentPiece', {}).get('x', 0)
        piece_y = state.get('currentPiece', {}).get('y', 0)
        
        # 调试输出
        if not board or len(board) != 20:
            self.log(f"棋盘数据异常: {len(board) if board else 'None'} 行", "ERROR")
            return
        
        self.log(f"初始位置: X={piece_x}, Y={piece_y}, 棋盘非零格数: {sum(sum(row) for row in board)}", "DEBUG")
        
        ai_state = create_initial_state(board, piece_type, piece_x, piece_y)
        
        # 运行 A* 搜索
        start_time = time.time()
        actions = self.ai.find_best_placement(ai_state)
        search_time = time.time() - start_time
        
        if actions:
            self.action_queue = actions
            
            # 计算目标位置
            target_pos = self._calculate_target(ai_state, actions)
            
            # 打印决策日志
            self.log_decision(
                piece_type=piece_type,
                actions=actions,
                target_pos=target_pos,
                evaluation=self.ai.last_evaluation,
                search_time=search_time,
                nodes=0
            )
            
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
            self.log(f"⚠️  A* 搜索失败，使用备用策略", "WARN")
            # 备用策略：直接硬降
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
                # 硬降：一直下落
                while True:
                    test_state = state.copy()
                    test_state.piece_y += 1
                    if self.ai.check_collision(test_state):
                        break
                    state.piece_y += 1
        
        return {
            "x": state.piece_x,
            "y": state.piece_y,
            "rotation": state.rotation
        }
    
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
