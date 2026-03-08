/**
 * server.js
 * 
 * Express 后端服务入口
 * 
 * 启动方式:
 *   node server.js           # 默认端口 8080
 *   node server.js --port 3001  # 指定端口
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './routes/auth.js';
import scoresRoutes from './routes/scores.js';
import aiRoutes from './routes/ai.js';

const app = express();

// 解析命令行参数
function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--port' && i + 1 < args.length) {
            parsed.port = parseInt(args[i + 1], 10);
            i++;
        }
    }
    
    return parsed;
}

const args = parseArgs();
const PORT = args.port || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Backend server running on http://127.0.0.1:${PORT}`);
    console.log(`Health check: http://127.0.0.1:${PORT}/health`);
    console.log(`Press Ctrl+C to stop`);
});

export default app;
