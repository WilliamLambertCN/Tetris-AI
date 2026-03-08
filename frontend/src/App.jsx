import React, { useState } from 'react';
import GameProvider, { GameContext } from './context/GameContext';
import Board from './components/Board/Board';

function AppContent() {
    const [showGameOver, setShowGameOver] = useState(false);

    const handleGameOver = () => {
        setShowGameOver(true);
    };

    const handleRestart = () => {
        const { startGame } = React.useContext(GameContext);
        startGame();
        setShowGameOver(false);
    };

    if (showGameOver) {
        return (
            <div className="game-over-overlay">
                <div className="game-over">
                    <h2>游戏结束</h2>
                    <p>最终得分：<span id="final-score">{score}</span></p>
                    <button onClick={handleRestart}>重新开始</button>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <Board />
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
