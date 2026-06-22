import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const utilsDir = path.dirname(fileURLToPath(import.meta.url));

/** מחפש קובץ SQL גם ב-server/db וגם ב-repo/db (Railway / מקומי). */
export function resolveDbFile(filename) {
  const candidates = [
    path.join(utilsDir, '../../db', filename),
    path.join(utilsDir, '../../../db', filename),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

export function sanitizeBootstrapSql(sql) {
  return sql
    .split('\n')
    .filter((line) => {
      const t = line.trim().toUpperCase();
      return !t.startsWith('USE ') && !t.startsWith('CREATE DATABASE');
    })
    .join('\n');
}

/** מריץ DDL — statement אחד בכל פעם (pool ללא multipleStatements). */
export async function executeBootstrapSql(pool, sql) {
  const cleaned = sanitizeBootstrapSql(sql);
  const statements = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await pool.query(stmt);
  }
}
