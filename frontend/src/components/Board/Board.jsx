import { useContext } from 'react';
import GameContext from '../../context/GameContext';

export default function Board() {
    const { boardCanvasRef, nextCanvasRef, currentPiece, score, level, renderBoard, renderNextPiece } = useContext(GameContext);

    // 强制重渲染
    const [, setTick] = React.useState(0);

    React.useEffect(() => {
        renderBoard();
    }, [renderBoard]);

    React.useEffect(() => {
        renderNextPiece();
    }, [renderNextPiece, nextPiece]);

    return (
        <div className="game-container">
            <canvas
                ref={boardCanvasRef}
                id="board"
                width={300}
                height={600}
                className="game-board"
            />

            <div className="info-panel">
                <div className="info-box">
                    <h3>分数</h3>
                    <p id="score">{score}</p>
                </div>

                <div className="info-box">
                    <h3>等级</h3>
                    <p id="level">{level}</p>
                </div>

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

                <div className="info-box controls">
                    <strong>操作说明：</strong><br />
                    ← → 左右移动<br />
                    ↑ 旋转<br />
                    ↓ 加速下落<br />
                    Space 暂停/继续
                </div>

                <button id="start-btn" onClick={handleStartGame}>
                    {paused || gameOver ? '重新开始' : '开始游戏'}
                </button>
            </div>
        </div>
    );
}
