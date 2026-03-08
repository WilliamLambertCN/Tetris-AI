import React, { useContext } from 'react';
import GameProvider, { GameContext } from './context/GameContext';
import Board from './components/Board/Board';

function AppContent() {
    const { gameOver, score, startGame } = useContext(GameContext);

    const handleRestart = () => {
        startGame();
    };

    return (
        <div className="app">
            {!gameOver && <Board />}
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

function App() {
    return (
        <GameProvider>
            <AppContent />
        </GameProvider>
    );
}

export default App;
