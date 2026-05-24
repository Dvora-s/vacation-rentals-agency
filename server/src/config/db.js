import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getSslConfig() {
  if (process.env.DB_SSL_MODE !== 'REQUIRED') {
    return undefined;
  }

  const caPath = path.join(__dirname, '../../db/ca.pem');

  if (fs.existsSync(caPath)) {
    return {
      ca: fs.readFileSync(caPath),
      rejectUnauthorized: true,
    };
  }

  return { rejectUnauthorized: true };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: getSslConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    const [rows] = await connection.query('SELECT 1 AS ok');
    return rows[0];
  } finally {
    connection.release();
  }
}

export default pool;
