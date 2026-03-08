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
 *   - AI 控制面板（带可视化）
 * 
 * @usage
 *   被 App.jsx 使用，需要在 GameProvider 内部：
 *   <GameProvider><Board /></GameProvider>
 */

import { useContext, useEffect, useRef } from 'react';
import { GameContext } from '../../context/GameContext';
import * as CONSTANTS from '../../utils/constants';

/**
 * Board 组件
 * 俄罗斯方块游戏的主界面
 */
export default function Board() {
    /**
     * 从 GameContext 获取游戏状态和方法
     */
    const {
        boardCanvasRef,
        nextCanvasRef,
        board,
        currentPiece,
        score,
        level,
        paused,
        aiMode,
        aiThinking,
        startGame,
        togglePause,
        toggleAiMode
    } = useContext(GameContext);

    const ghostCanvasRef = useRef(null);

    /**
     * 绘制 AI 目标位置的"幽灵"预览
     */
    useEffect(() => {
        if (!aiMode || !aiThinking.targetX || !currentPiece || !ghostCanvasRef.current) {
            return;
        }

        const canvas = ghostCanvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // 清空
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 获取方块的旋转形状
        const shape = CONSTANTS.SHAPES[currentPiece.type]?.shape || currentPiece.shape;
        if (!shape) return;

        // 绘制"幽灵"方块（半透明）
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#00ff66';
        
        const blockSize = 30;
        const offsetX = aiThinking.targetX * blockSize;
        const offsetY = aiThinking.targetY * blockSize;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    ctx.fillRect(
                        offsetX + col * blockSize,
                        offsetY + row * blockSize,
                        blockSize - 2,
                        blockSize - 2
                    );
                }
            }
        }
        
        ctx.globalAlpha = 1.0;
    }, [aiMode, aiThinking, currentPiece]);

    /**
     * 处理开始游戏按钮点击
     */
    const handleStartGame = () => {
        startGame();
    };

    /**
     * 处理 AI 模式切换
     */
    const handleToggleAi = () => {
        toggleAiMode();
    };

    /**
     * 获取 AI 状态显示文本
     */
    const getAiStatusText = () => {
        if (!aiMode) return '⚪ 已关闭';
        if (aiThinking.isThinking) return '🧠 思考中...';
        if (aiThinking.plannedActions.length > 0) return '⚡ 执行中';
        return '🟢 运行中';
    };

    return (
        <div className="app">
            {/* 游戏区域包装器 */}
            <div className="game-area" style={{ position: 'relative' }}>
                {/* 主游戏棋盘 */}
                <canvas
                    ref={boardCanvasRef}
                    id="board"
                    width={300}
                    height={600}
                    className="game-board"
                />
                
                {/* AI 目标位置预览（幽灵方块） */}
                {aiMode && (
                    <canvas
                        ref={ghostCanvasRef}
                        width={300}
                        height={600}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            pointerEvents: 'none',
                            zIndex: 10
                        }}
                    />
                )}
            </div>

            {/* 信息面板 */}
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
                        width={80}
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

                {/* AI 控制面板 */}
                <div className={`info-box ai-panel ${aiMode ? 'ai-active' : ''}`}>
                    <h3>🤖 AI 控制</h3>
                    <div className="ai-status">
                        状态: {getAiStatusText()}
                    </div>
                    
                    {/* AI 可视化信息 */}
                    {aiMode && (
                        <div className="ai-visualization">
                            {aiThinking.isThinking && (
                                <div className="ai-thinking-indicator">
                                    <span className="spinner">🧠</span> 计算最优路径...
                                </div>
                            )}
                            
                            {aiThinking.searchTime > 0 && (
                                <div className="ai-stats">
                                    <small>
                                        搜索: {aiThinking.searchTime.toFixed(0)}ms | 
                                        节点: {aiThinking.searchNodes}
                                    </small>
                                </div>
                            )}
                            
                            {aiThinking.targetX !== null && (
                                <div className="ai-target">
                                    <small>
                                        目标: ({aiThinking.targetX}, {aiThinking.targetY})
                                        {aiThinking.targetRotation !== null && ` 旋转${aiThinking.targetRotation}`}
                                    </small>
                                </div>
                            )}
                            
                            {aiThinking.plannedActions.length > 0 && (
                                <div className="ai-actions">
                                    <small>计划动作:</small>
                                    <div className="action-queue">
                                        {aiThinking.plannedActions.slice(0, 8).map((action, idx) => (
                                            <span 
                                                key={idx} 
                                                className={`action-badge ${idx === 0 ? 'next' : ''}`}
                                            >
                                                {getActionIcon(action)}
                                            </span>
                                        ))}
                                        {aiThinking.plannedActions.length > 8 && (
                                            <span className="action-more">...</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <button 
                        onClick={handleToggleAi}
                        className={aiMode ? 'ai-active' : ''}
                    >
                        {aiMode ? '关闭 AI' : '启用 AI'}
                    </button>
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

/**
 * 获取动作图标
 */
function getActionIcon(action) {
    const icons = {
        'left': '←',
        'right': '→',
        'rotate': '↻',
        'down': '↓',
        'hard_drop': '',
        'noop': '○'
    };
    return icons[action] || action;
}
