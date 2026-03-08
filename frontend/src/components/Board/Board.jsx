/**
 * Board.jsx
 * 
 * 游戏主界面组件
 * 负责渲染游戏棋盘、信息面板和操作按钮
 * 
 * @description 本组件展示：
 *   - 主游戏棋盘（Canvas 绘制）
 *   - 分数、等级信息
 *   - 下一个方块预览
 *   - 操作说明
 *   - 开始/暂停按钮
 * 
 * @usage
 *   被 App.jsx 使用，需要在 GameProvider 内部：
 *   <GameProvider><Board /></GameProvider>
 */

import { useContext } from 'react';
import { GameContext } from '../../context/GameContext';

/**
 * Board 组件
 * 俄罗斯方块游戏的主界面
 */
export default function Board() {
    /**
     * 从 GameContext 获取游戏状态和方法
     * 
     * boardCanvasRef: 绑定主棋盘 Canvas 元素的 ref
     * nextCanvasRef: 绑定预览 Canvas 元素的 ref
     * score: 当前分数
     * level: 当前等级
     * gameOver: 游戏是否结束
     * paused: 游戏是否暂停
     * startGame: 开始/重新开始游戏的方法
     * togglePause: 暂停/继续游戏的方法
     */
    const {
        boardCanvasRef,    // 主棋盘 Canvas ref
        nextCanvasRef,     // 预览 Canvas ref
        score,             // 当前分数
        level,             // 当前等级
        paused,            // 暂停状态
        startGame,         // 开始游戏方法
        togglePause        // 暂停切换方法
    } = useContext(GameContext);

    /**
     * 处理开始游戏按钮点击
     * 调用 GameContext 中的 startGame 方法
     */
    const handleStartGame = () => {
        startGame();
    };

    return (
        // 外层容器：使用 flex 布局排列棋盘和信息面板
        <div className="app">
            {/* 
                主游戏棋盘 Canvas
                width/height: 300x600 像素（10列x20行，每格30px）
                ref: 绑定到 GameContext，用于绘制游戏画面
            */}
            <canvas
                ref={boardCanvasRef}
                id="board"
                width={300}
                height={600}
                className="game-board"
            />

            {/* 信息面板：显示分数、等级、预览等 */}
            <div className="info-panel">
                
                {/* 分数显示 */}
                <div className="info-box">
                    <h3>分数</h3>
                    <p id="score">{score}</p>
                </div>

                {/* 等级显示 */}
                <div className="info-box">
                    <h3>等级</h3>
                    <p id="level">{level}</p>
                </div>

                {/* 下一个方块预览 */}
                <div className="info-box">
                    <h3>下一个</h3>
                    <canvas
                        ref={nextCanvasRef}
                        id="next"
                        width={80}      // 4x4 预览区域，每格20px
                        height={80}
                        className="next-piece-canvas"
                    />
                </div>

                {/* 操作说明 */}
                <div className="info-box controls">
                    <strong>操作说明：</strong><br />
                    ← → 左右移动<br />
                    ↑ 旋转<br />
                    ↓ 加速下落<br />
                    Space 暂停/继续
                </div>

                {/* 开始游戏按钮 */}
                <button onClick={handleStartGame}>
                    {paused ? '继续游戏' : '开始游戏'}
                </button>

                {/* 暂停时显示继续按钮 */}
                {paused && (
                    <button onClick={togglePause} style={{ marginTop: '10px' }}>
                        继续
                    </button>
                )}
            </div>
        </div>
    );
}
