import express from 'express';
const router = express.Router();

// Mock user registry for testing (in production, use a database)
const users = new Map();

// GET /api/users - List all users (for testing)
router.get('/', (req, res) => {
    const userArray = Array.from(users.values());
    res.json(userArray);
});

// POST /api/auth/register - Register a new user
router.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (users.has(username)) {
        return res.status(409).json({ error: 'Username already exists' });
    }

    const userId = 'user_' + Date.now();
    users.set(userId, { id: userId, username, password, email: email || '' });

    res.status(201).json({ message: 'User registered successfully', data: { id: userId, username } });
});

// POST /api/auth/login - Login user
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = Array.from(users.keys()).find(key => users.get(key).username === username);
    if (!userId || users.get(userId).password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // In production, generate JWT token here
    res.json({ message: 'Login successful', data: { id: userId, username } });
});

// POST /api/auth/logout - Logout user
router.post('/logout', (req, res) => {
    res.json({ message: 'Logout successful' });
});

// GET /api/auth/me - Get current user info
router.get('/me', (req, res) => {
    // In production, verify JWT token here
    const userId = req.query.id || null;
    if (!userId) {
        return res.status(401).json({ error: 'No user identified' });
    }

    const user = users.get(userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Don't return password in response
    res.json({ id: userId, username: user.username, email: user.email });
});

export default router;
