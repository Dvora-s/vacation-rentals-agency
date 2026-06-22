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
