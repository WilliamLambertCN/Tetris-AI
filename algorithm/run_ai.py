"""
run_ai.py

A* AI 自动化运行脚本

@description 本脚本是 AI 控制的主入口：
    1. 连接到游戏后端
    2. 切换到 AI 模式
    3. 持续获取游戏状态
    4. 使用 A* 算法计算最佳动作
    5. 发送动作指令控制游戏

@usage
    python run_ai.py

@requirements
    pip install requests
"""

import time
import sys
from typing import Optional

from api_client import TetrisAPI
from tetris_ai import AStarTetris, TetrisState, Action, create_initial_state


class TetrisAIController:
    """
    AI 游戏控制器
    
    协调 API 客户端和 A* 算法，实现自动游戏
    """
    
    def __init__(self, api_base_url: str = "http://127.0.0.1:3001/api"):
        """
        Args:
            api_base_url: API 基础 URL
        """
        self.api = TetrisAPI(api_base_url)
        self.ai = AStarTetris(max_search_time=0.5)
        
        # 统计
        self.total_actions = 0
        self.total_pieces = 0
        self.start_time = None
        
        # 当前动作队列
        self.action_queue: list[Action] = []
        
        # 上一次的方块类型（用于检测新方块）
        self.last_piece_type: Optional[str] = None
    
    def run(self):
        """运行 AI 控制器"""
        print("=" * 50)
        print("🎮 Tetris A* AI Controller")
        print("=" * 50)
        
        # 1. 等待服务器
        if not self.api.wait_for_server(max_wait=30):
            print("❌ Cannot connect to game server!")
            print("Please start the backend server first:")
            print("  cd backend && npm start")
            sys.exit(1)
        
        # 2. 切换到 AI 模式
        print("\n🤖 Switching to AI mode...")
        try:
            self.api.set_mode('AI')
            print("✅ AI mode activated!")
        except Exception as e:
            print(f"⚠️  Failed to set AI mode: {e}")
        
        # 3. 开始游戏（如果没有运行）
        print("\n🎲 Starting game...")
        try:
            self.api.start_game()
            print("✅ Game started!")
        except Exception as e:
            print(f"⚠️  Failed to start game: {e}")
        
        self.start_time = time.time()
        
        # 4. 主循环
        print("\n" + "=" * 50)
        print("🚀 AI is now playing! Press Ctrl+C to stop.")
        print("=" * 50 + "\n")
        
        try:
            self._main_loop()
        except KeyboardInterrupt:
            self._stop()
    
    def _main_loop(self):
        """主游戏循环"""
        while True:
            # 获取游戏状态
            state = self.api.get_state()
            if not state:
                time.sleep(0.1)
                continue
            
            # 检查游戏结束
            if state.get('gameOver'):
                print("\n💀 Game Over!")
                self._print_stats(state)
                print("\n🔄 Restarting in 3 seconds...")
                time.sleep(3)
                self.api.start_game()
                self.action_queue = []
                self.total_pieces = 0
                self.start_time = time.time()
                continue
            
            # 检查是否有当前方块
            current_piece = state.get('currentPiece')
            if not current_piece:
                time.sleep(0.05)
                continue
            
            # 检测新方块
            piece_type = current_piece.get('type')
            if piece_type != self.last_piece_type:
                # 新方块，重新规划
                self.last_piece_type = piece_type
                self.total_pieces += 1
                self.action_queue = []
                
                # 计算最佳路径
                self._plan_moves(state)
            
            # 执行动作队列中的动作
            if self.action_queue:
                action = self.action_queue.pop(0)
                self._execute_action(action)
                self.total_actions += 1
            else:
                # 动作队列为空，可能是方块还没落地
                # 发送一个 down 动作让它快点落下
                self._execute_action(Action.MOVE_DOWN)
            
            # 控制速度
            time.sleep(0.05)
    
    def _plan_moves(self, state: dict):
        """
        使用 A* 算法规划动作
        
        Args:
            state: 游戏状态（来自 API）
        """
        current_piece = state.get('currentPiece')
        if not current_piece:
            return
        
        # 构建初始状态
        board = state.get('board', [])
        piece_type = current_piece.get('type')
        piece_x = current_piece.get('x', 0)
        piece_y = current_piece.get('y', 0)
        
        # 如果没有旋转信息，默认为 0
        rotation = current_piece.get('rotation', 0)
        
        # 创建 A* 初始状态
        ai_state = create_initial_state(board, piece_type, piece_x, piece_y)
        ai_state.rotation = rotation
        
        # 运行 A* 搜索
        start_time = time.time()
        actions = self.ai.find_best_placement(ai_state)
        search_time = time.time() - start_time
        
        if actions:
            self.action_queue = actions
            print(f"🧠 Planned {len(actions)} actions for {piece_type} "
                  f"(search: {search_time*1000:.1f}ms)")
        else:
            # A* 没找到路径，使用简单策略
            print(f"⚠️  A* failed for {piece_type}, using fallback")
            self._fallback_strategy(ai_state)
    
    def _fallback_strategy(self, state: TetrisState):
        """
        备用策略：当 A* 失败时使用
        
        简单的贪心策略：尽量居中，然后硬降
        """
        center_x = 10 // 2
        actions = []
        
        # 移动到中心附近
        while state.piece_x < center_x - 1:
            actions.append(Action.MOVE_RIGHT)
            state.piece_x += 1
        while state.piece_x > center_x - 1:
            actions.append(Action.MOVE_LEFT)
            state.piece_x -= 1
        
        # 硬降
        actions.append(Action.HARD_DROP)
        
        self.action_queue = actions
    
    def _execute_action(self, action: Action):
        """
        执行单个动作
        
        Args:
            action: 动作枚举
        """
        action_name = action.value
        try:
            self.api.send_action(action_name)
        except Exception as e:
            print(f"❌ Failed to execute {action_name}: {e}")
    
    def _print_stats(self, state: dict):
        """打印游戏统计"""
        if not self.start_time:
            return
        
        duration = time.time() - self.start_time
        score = state.get('score', 0)
        level = state.get('level', 1)
        
        print("\n📊 Game Statistics:")
        print(f"   Score: {score}")
        print(f"   Level: {level}")
        print(f"   Pieces: {self.total_pieces}")
        print(f"   Actions: {self.total_actions}")
        print(f"   Duration: {duration:.1f}s")
        if duration > 0:
            print(f"   APM: {self.total_actions / duration * 60:.1f}")
    
    def _stop(self):
        """停止 AI 控制器"""
        print("\n\n🛑 Stopping AI controller...")
        
        # 切换回手动模式
        try:
            self.api.set_mode('MANUAL')
            print("✅ Switched back to MANUAL mode")
        except Exception as e:
            print(f"⚠️  Failed to switch mode: {e}")
        
        print("👋 Goodbye!")


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Tetris A* AI Controller')
    parser.add_argument(
        '--url',
        default='http://127.0.0.1:3001/api',
        help='API base URL (default: http://127.0.0.1:3001/api)'
    )
    parser.add_argument(
        '--test',
        action='store_true',
        help='Run in test mode (no server required)'
    )
    
    args = parser.parse_args()
    
    if args.test:
        print("Running in test mode...")
        # 测试 A* 算法
        from tetris_ai import create_initial_state
        
        board = [[0] * 10 for _ in range(20)]
        state = create_initial_state(board, 'T', 4, 0)
        
        ai = AStarTetris(max_search_time=0.5)
        actions = ai.find_best_placement(state)
        
        print(f"Test result: {[a.value for a in actions]}")
        return
    
    # 正常运行
    controller = TetrisAIController(args.url)
    controller.run()


if __name__ == '__main__':
    main()
