import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { testConnection } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    const dbStatus = await testConnection();
    res.json({
      status: 'ok',
      message: 'Server is running',
      database: dbStatus.ok === 1 ? 'connected' : 'unknown',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Server is running but database is unavailable',
      error: error.message,
    });
  }
});

app.get('/api/db-info', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS db_name, VERSION() AS version');
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
