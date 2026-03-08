// Score storage (in-memory for now, can be migrated to database)
const scores = new Map();

class Score {
    constructor(username, score) {
        this.username = username;
        this.score = score;
        this.createdAt = new Date().toISOString();
    }
}

// Get top scores
export function getTopScores(limit = 10) {
    const sorted = Array.from(scores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    return sorted.map(s => ({
        id: s.username,
        username: s.username,
        score: s.score,
        createdAt: s.createdAt
    }));
}

// Get user scores
export function getUserScores(username) {
    const userScores = Array.from(scores.values())
        .filter(s => s.username === username)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return userScores.map(s => ({
        id: s.username,
        username: s.username,
        score: s.score,
        createdAt: s.createdAt
    }));
}

// Add score
export function addScore(username, score) {
    const newScore = new Score(username, score);
    scores.set(username + '_' + Date.now(), newScore);
    return newScore;
}

// Clear all scores (reset)
export function clearScores() {
    scores.clear();
}

// Get total count
export function getScoreCount() {
    return scores.size;
}

export default Score;
