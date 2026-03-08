/**
 * App.jsx
 * 
 * 应用根组件
 * 负责整体布局和游戏状态管理
 * 
 * @description 本组件包含：
 *   - GameProvider: 提供游戏全局状态
 *   - AppContent: 实际内容，根据游戏状态显示不同界面
 *     - 游戏进行中：显示 Board 组件
 *     - 游戏结束：显示结束画面
 */

import React, { useContext } from 'react';
import GameProvider, { GameContext } from './context/GameContext';
import Board from './components/Board/Board';

/**
 * AppContent 组件
 * 实际的页面内容，使用 GameContext 获取游戏状态
 * 
 * 注意：必须在 GameProvider 内部使用，因为 useContext 需要 Provider
 */
function AppContent() {
    /**
     * 从 Context 获取游戏状态
     * gameOver: 游戏是否结束
     * score: 最终分数（游戏结束时显示）
     * startGame: 重新开始游戏的方法
     */
    const { gameOver, score, startGame } = useContext(GameContext);

    /**
     * 处理重新开始
     * 调用 startGame 重置游戏状态
     */
    const handleRestart = () => {
        startGame();
    };

    return (
        <div className="app">
            {/* 
                条件渲染：
                - 游戏未结束：显示游戏棋盘
                - 游戏结束：显示结束画面
            */}
            {!gameOver && <Board />}
            
            {/* 游戏结束画面 */}
            {gameOver && (
                <div className="game-over-overlay">
                    <div className="game-over">
                        <h2>游戏结束</h2>
                        <p>最终得分：<span id="final-score">{score}</span></p>
                        <button onClick={handleRestart}>重新开始</button>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * App 组件（应用入口）
 * 使用 GameProvider 包裹 AppContent，提供全局游戏状态
 */
function App() {
    return (
        <GameProvider>
            <AppContent />
        </GameProvider>
    );
}

export default App;
