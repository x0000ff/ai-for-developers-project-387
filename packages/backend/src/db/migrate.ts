import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env.DATABASE_URL ?? path.join(__dirname, '../../../app.db');
const sqlite = new Database(dbUrl);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle') });

console.log('Migrations applied');
sqlite.close();
