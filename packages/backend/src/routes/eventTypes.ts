import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/index.js';
import { makeEventTypesRepo } from '../repositories/eventTypesRepo.js';

const createBodySchema = {
  type: 'object',
  required: ['name', 'durationMinutes'],
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    durationMinutes: { type: 'integer', minimum: 1 },
  },
  additionalProperties: false,
} as const;

const updateBodySchema = {
  type: 'object',
  required: ['name', 'durationMinutes'],
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    durationMinutes: { type: 'integer', minimum: 1 },
  },
  additionalProperties: false,
} as const;

/** Serialize an event_types row to the API shape */
function toDto(row: { id: string; name: string; description: string; durationMinutes: number }) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.durationMinutes,
  };
}

export async function eventTypesRoutes(app: FastifyInstance, { db }: { db: Db }) {
  const repo = makeEventTypesRepo(db);

  app.get('/event-types', async () => {
    return repo.list().map(toDto);
  });

  app.get<{ Params: { id: string } }>('/event-types/:id', async (req, reply) => {
    const eventType = repo.getById(req.params.id);
    if (!eventType) return reply.status(404).send({ message: 'Not found' });
    return toDto(eventType);
  });

  app.post<{ Body: { name: string; description?: string; durationMinutes: number } }>(
    '/event-types',
    { schema: { body: createBodySchema } },
    async (req, reply) => {
      const created = repo.create(req.body);
      return reply.status(201).send(toDto(created));
    },
  );

  app.put<{
    Params: { id: string };
    Body: { name: string; description?: string; durationMinutes: number };
  }>('/event-types/:id', { schema: { body: updateBodySchema } }, async (req, reply) => {
    const updated = repo.update(req.params.id, req.body);
    if (!updated) return reply.status(404).send({ message: 'Not found' });
    return toDto(updated);
  });

  app.delete<{ Params: { id: string } }>('/event-types/:id', async (req, reply) => {
    const deleted = repo.delete(req.params.id);
    if (!deleted) return reply.status(404).send({ message: 'Not found' });
    return reply.status(204).send();
  });
}
