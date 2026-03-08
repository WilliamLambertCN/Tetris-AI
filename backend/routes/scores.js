import express from 'express';
import * as scoresService from '../models/Scores.js';

const router = express.Router();

// GET /api/scores - Get top scores
router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    try {
        const scores = scoresService.getTopScores(limit);
        res.json(scores);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});

// POST /api/scores - Submit a new score
router.post('/', (req, res) => {
    const { username, score } = req.body;

    if (!username || score === undefined) {
        return res.status(400).json({ error: 'Missing required fields: username and score' });
    }

    try {
        const newScore = scoresService.addScore(username, parseInt(score));
        res.json({ message: 'Score submitted successfully', data: newScore });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit score' });
    }
});

// GET /api/scores/user/:username - Get user's scores
router.get('/user/:username', (req, res) => {
    const { username } = req.params;
    try {
        const userScores = scoresService.getUserScores(username);
        res.json(userScores);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user scores' });
    }
});

export default router;
