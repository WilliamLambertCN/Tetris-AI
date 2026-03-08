/**
 * Board.jsx - 游戏主界面组件
 */

import { useContext, useEffect, useRef } from 'react';
import { GameContext } from '../../context/GameContext';
import * as CONSTANTS from '../../utils/constants';

export default function Board() {
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

    // 绘制 AI 目标位置预览 (Ghost Piece)
    useEffect(() => {
        const canvas = ghostCanvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 检查是否有有效的目标位置
        const hasValidTarget = aiThinking.targetX != null && aiThinking.targetY != null && aiThinking.targetRotation != null;
        
        if (!aiMode || !hasValidTarget || !currentPiece) {
            return;
        }

        const targetRotation = aiThinking.targetRotation || 0;
        const shape = getRotatedShape(currentPiece.type, targetRotation);
        if (!shape) return;

        // 绘制半透明填充
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#00ff66';
        
        // 绘制边框
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 2;
        
        const blockSize = 30;
        const offsetX = aiThinking.targetX * blockSize;
        const offsetY = aiThinking.targetY * blockSize;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    // 填充
                    ctx.globalAlpha = 0.25;
                    ctx.fillStyle = '#00ff66';
                    ctx.fillRect(
                        offsetX + col * blockSize + 1,
                        offsetY + row * blockSize + 1,
                        blockSize - 2,
                        blockSize - 2
                    );
                    // 边框
                    ctx.globalAlpha = 0.8;
                    ctx.strokeRect(
                        offsetX + col * blockSize + 1,
                        offsetY + row * blockSize + 1,
                        blockSize - 2,
                        blockSize - 2
                    );
                }
            }
        }
        
        ctx.globalAlpha = 1.0;
    }, [aiMode, aiThinking, currentPiece]);

    const handleStartGame = () => startGame();
    const handleToggleAi = () => toggleAiMode();

    const getAiStatusText = () => {
        if (!aiMode) return 'Off';
        if (aiThinking.isThinking) return 'Thinking...';
        if (aiThinking.plannedActions.length > 0) return 'Running';
        return 'Active';
    };

    return (
        <div className="app">
            <div className="game-area" style={{ position: 'relative' }}>
                <canvas
                    ref={boardCanvasRef}
                    id="board"
                    width={300}
                    height={600}
                    className="game-board"
                />
                
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

            <div className="info-panel">
                <div className="info-box">
                    <h3>Score</h3>
                    <p>{score}</p>
                </div>

                <div className="info-box">
                    <h3>Level</h3>
                    <p>{level}</p>
                </div>

                <div className="info-box">
                    <h3>Next</h3>
                    <canvas
                        ref={nextCanvasRef}
                        id="next"
                        width={80}
                        height={80}
                        className="next-piece-canvas"
                    />
                </div>

                <div className="info-box controls">
                    <strong>Controls:</strong><br />
                    Arrow Keys: Move/Rotate<br />
                    Down: Soft Drop<br />
                    Space: Pause
                </div>

                <div className={`info-box ai-panel ${aiMode ? 'ai-active' : ''}`}>
                    <h3>AI Control</h3>
                    <div className="ai-status">Status: {getAiStatusText()}</div>
                    
                    {aiMode && (
                        <div className="ai-visualization">
                            {aiThinking.searchTime > 0 && (
                                <div className="ai-stats">
                                    <small>
                                        Target: ({aiThinking.targetX}, {aiThinking.targetY})<br/>
                                        Score: {aiThinking.evaluationScore?.toFixed ? aiThinking.evaluationScore.toFixed(2) : aiThinking.evaluationScore}<br/>
                                        Time: {aiThinking.searchTime?.toFixed ? aiThinking.searchTime.toFixed(0) : aiThinking.searchTime}ms
                                    </small>
                                </div>
                            )}
                            
                            {aiThinking.plannedActions.length > 0 && (
                                <div className="ai-actions">
                                    <small>Actions:</small>
                                    <div className="action-queue">
                                        {aiThinking.plannedActions.slice(0, 6).map((action, idx) => (
                                            <span key={idx} className={`action-badge ${idx === 0 ? 'next' : ''}`}>
                                                {getActionIcon(action)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <button onClick={handleToggleAi} className={aiMode ? 'ai-active' : ''}>
                        {aiMode ? 'Stop AI' : 'Start AI'}
                    </button>
                </div>

                <button onClick={handleStartGame}>
                    {paused ? 'Resume' : 'Start Game'}
                </button>

                {paused && (
                    <button onClick={togglePause} style={{ marginTop: '10px' }}>
                        Resume
                    </button>
                )}
            </div>
        </div>
    );
}

// 获取旋转后的方块形状
function getRotatedShape(type, rotation) {
    const shapes = {
        I: [
            [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]],
            [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
            [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
            [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]]
        ],
        J: [
            [[0,1,0], [0,1,0], [1,1,0]],
            [[1,0,0], [1,1,1], [0,0,0]],
            [[0,1,1], [0,1,0], [0,1,0]],
            [[0,0,0], [1,1,1], [0,0,1]]
        ],
        L: [
            [[0,1,0], [0,1,0], [0,1,1]],
            [[0,0,0], [1,1,1], [1,0,0]],
            [[1,1,0], [0,1,0], [0,1,0]],
            [[0,0,1], [1,1,1], [0,0,0]]
        ],
        O: [
            [[1,1], [1,1]],
            [[1,1], [1,1]],
            [[1,1], [1,1]],
            [[1,1], [1,1]]
        ],
        S: [
            [[0,1,1], [1,1,0], [0,0,0]],
            [[0,1,0], [0,1,1], [0,0,1]],
            [[0,0,0], [0,1,1], [1,1,0]],
            [[1,0,0], [1,1,0], [0,1,0]]
        ],
        T: [
            [[0,1,0], [1,1,1], [0,0,0]],
            [[0,1,0], [0,1,1], [0,1,0]],
            [[0,0,0], [1,1,1], [0,1,0]],
            [[0,1,0], [1,1,0], [0,1,0]]
        ],
        Z: [
            [[1,1,0], [0,1,1], [0,0,0]],
            [[0,0,1], [0,1,1], [0,1,0]],
            [[0,0,0], [1,1,0], [0,1,1]],
            [[0,1,0], [1,1,0], [1,0,0]]
        ]
    };
    
    return shapes[type]?.[rotation] || shapes[type]?.[0];
}

function getActionIcon(action) {
    const icons = {
        'left': 'L',
        'right': 'R',
        'rotate': 'Rot',
        'down': 'D',
        'hard_drop': 'Drop',
        'noop': '-'
    };
    return icons[action] || action;
}
