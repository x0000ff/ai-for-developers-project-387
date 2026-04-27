import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildApp } from './app.js';
import { db, sqlite } from './db/index.js';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Apply pending migrations on startup
migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') });

const app = buildApp({ logger: true, db });

// Serve frontend build
app.register(fastifyStatic, {
  root: path.join(__dirname, '../../frontend/dist'),
  prefix: '/',
});

// SPA fallback: return index.html for all non-API, non-asset routes
app.setNotFoundHandler((_req, reply) => {
  reply.sendFile('index.html');
});

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    sqlite.close();
    process.exit(1);
  }
};

start();
