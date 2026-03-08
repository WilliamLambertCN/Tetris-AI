"""
api_client.py

后端 API 客户端
用于 Python AI 与游戏后端通信
"""

import requests
import time
from typing import Optional, Dict, Any, List


class TetrisAPI:
    """
    俄罗斯方块游戏 API 客户端
    
    用于获取游戏状态、发送控制指令
    """
    
    def __init__(self, base_url: str = "http://127.0.0.1:8080/api"):
        """
        Args:
            base_url: API 基础 URL
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
    
    # ============================================
    # 游戏模式控制
    # ============================================
    
    def get_mode(self) -> Dict[str, Any]:
        """获取当前游戏模式"""
        response = self.session.get(f"{self.base_url}/ai/mode")
        response.raise_for_status()
        return response.json()
    
    def set_mode(self, mode: str) -> Dict[str, Any]:
        """
        设置游戏模式
        
        Args:
            mode: 'MANUAL' 或 'AI'
        """
        response = self.session.post(
            f"{self.base_url}/ai/mode",
            json={"mode": mode}
        )
        response.raise_for_status()
        return response.json()
    
    # ============================================
    # 游戏状态
    # ============================================
    
    def get_state(self) -> Optional[Dict[str, Any]]:
        """
        获取当前游戏状态
        
        Returns:
            游戏状态字典，如果没有游戏则返回 None
        """
        try:
            response = self.session.get(
                f"{self.base_url}/ai/state",
                timeout=2
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Failed to get state: {e}")
            return None
    
    def report_state(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        上报游戏状态（供前端调用，AI一般不直接调用）
        
        Args:
            state: 游戏状态
        """
        response = self.session.post(
            f"{self.base_url}/ai/state",
            json=state,
            timeout=2
        )
        response.raise_for_status()
        return response.json()
    
    # ============================================
    # 动作控制
    # ============================================
    
    def send_action(self, action: str) -> Dict[str, Any]:
        """
        发送动作指令
        
        Args:
            action: 动作名称 ('left', 'right', 'rotate', 'down', 'hard_drop')
        """
        response = self.session.post(
            f"{self.base_url}/ai/action",
            json={"action": action},
            timeout=2
        )
        response.raise_for_status()
        return response.json()
    
    def get_actions(self) -> List[Dict[str, Any]]:
        """
        获取待执行的动作列表（前端轮询使用）
        
        Returns:
            动作列表
        """
        try:
            response = self.session.get(
                f"{self.base_url}/ai/action",
                timeout=2
            )
            response.raise_for_status()
            data = response.json()
            return data.get('actions', [])
        except requests.exceptions.RequestException:
            return []
    
    # ============================================
    # 游戏控制
    # ============================================
    
    def start_game(self) -> Dict[str, Any]:
        """开始新游戏"""
        response = self.session.post(f"{self.base_url}/ai/start")
        response.raise_for_status()
        return response.json()
    
    def reset_game(self) -> Dict[str, Any]:
        """重置游戏"""
        response = self.session.post(f"{self.base_url}/ai/reset")
        response.raise_for_status()
        return response.json()
    
    # ============================================
    # 方块定义
    # ============================================
    
    def get_shapes(self) -> Dict[str, Any]:
        """获取方块形状定义"""
        response = self.session.get(f"{self.base_url}/ai/shapes")
        response.raise_for_status()
        return response.json()
    
    # ============================================
    # 健康检查
    # ============================================
    
    def health_check(self) -> bool:
        """检查 API 是否可用"""
        try:
            response = self.session.get(
                f"{self.base_url}/ai/health",
                timeout=2
            )
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False
    
    def wait_for_server(self, max_wait: float = 30) -> bool:
        """
        等待服务器启动
        
        Args:
            max_wait: 最大等待时间（秒）
        
        Returns:
            是否成功连接
        """
        print("Waiting for server...")
        start = time.time()
        while time.time() - start < max_wait:
            if self.health_check():
                print("Server is ready!")
                return True
            time.sleep(0.5)
        print("Server connection timeout!")
        return False


if __name__ == '__main__':
    # 测试 API 客户端
    api = TetrisAPI()
    
    # 等待服务器
    if not api.wait_for_server(max_wait=10):
        exit(1)
    
    # 测试接口
    print("\n=== Health Check ===")
    print(f"Health: {api.health_check()}")
    
    print("\n=== Get Mode ===")
    print(api.get_mode())
    
    print("\n=== Get Shapes ===")
    shapes = api.get_shapes()
    print(f"Available shapes: {list(shapes.keys())}")
