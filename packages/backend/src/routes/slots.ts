import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/index.js';
import { listAvailable } from '../services/slotsService.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function slotsRoutes(app: FastifyInstance, { db }: { db: Db }) {
  app.get<{ Params: { id: string }; Querystring: { date?: string } }>(
    '/event-types/:id/slots',
    async (req, reply) => {
      const { date } = req.query;
      if (!date || !DATE_RE.test(date)) {
        return reply.status(400).send({ message: 'date query param is required (YYYY-MM-DD)' });
      }

      // Validate that requested date is within the next 14 days
      const maxAllowedDate = new Date();
      maxAllowedDate.setDate(maxAllowedDate.getDate() + 14);
      const requestedDate = new Date(date);
      if (requestedDate > maxAllowedDate) {
        return reply.status(400).send({ message: 'Date is too far in the future (max 14 days)' });
      }

      const slots = listAvailable(db, req.params.id, date, new Date());
      if (slots === null) {
        return reply.status(404).send({ message: 'Not found' });
      }

      return slots;
    },
  );
}
