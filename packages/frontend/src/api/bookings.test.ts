import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Booking } from '@app/api';
import { ApiError, bookingsApi } from './bookings';

const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('bookingsApi', () => {
  const mockBooking: Booking = {
    id: 'b1',
    eventTypeId: '1',
    eventTypeName: 'Call',
    startsAt: '2025-06-01T12:00:00.000Z',
    endsAt: '2025-06-01T12:30:00.000Z',
    guestName: 'John',
    guestEmail: 'john@example.com',
  };

  describe('getSlots', () => {
    it('fetches slots for an event type and date', async () => {
      const slots = ['10:00', '10:30', '11:00'];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => slots,
      });

      const result = await bookingsApi.getSlots('1', '2025-06-01');

      expect(mockFetch).toHaveBeenCalledWith('/api/event-types/1/slots?date=2025-06-01');
      expect(result).toEqual(slots);
    });

    it('throws ApiError on failed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Event type not found' }),
      });

      await expect(bookingsApi.getSlots('invalid', '2025-06-01')).rejects.toThrow(ApiError);
    });
  });

  describe('createBooking', () => {
    it('creates a booking and returns it', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBooking,
      });

      const result = await bookingsApi.createBooking({
        eventTypeId: '1',
        startsAt: '2025-06-01T12:00:00.000Z',
        guestName: 'John',
        guestEmail: 'john@example.com',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTypeId: '1',
          startsAt: '2025-06-01T12:00:00.000Z',
          guestName: 'John',
          guestEmail: 'john@example.com',
        }),
      });
      expect(result).toEqual(mockBooking);
    });

    it('throws ApiError on conflict', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Time slot is already booked' }),
      });

      await expect(
        bookingsApi.createBooking({
          eventTypeId: '1',
          startsAt: '2025-06-01T12:00:00.000Z',
          guestName: 'John',
          guestEmail: 'john@example.com',
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('listUpcoming', () => {
    it('fetches upcoming bookings', async () => {
      const bookings = [mockBooking];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => bookings,
      });

      const result = await bookingsApi.listUpcoming();

      expect(mockFetch).toHaveBeenCalledWith('/api/bookings');
      expect(result).toEqual(bookings);
    });

    it('returns empty array when no bookings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await bookingsApi.listUpcoming();

      expect(result).toEqual([]);
    });
  });

  describe('listPast', () => {
    it('fetches past bookings', async () => {
      const pastBooking: Booking = {
        ...mockBooking,
        startsAt: '2024-06-01T12:00:00.000Z',
        endsAt: '2024-06-01T12:30:00.000Z',
      };
      const bookings = [pastBooking];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => bookings,
      });

      const result = await bookingsApi.listPast();

      expect(mockFetch).toHaveBeenCalledWith('/api/bookings/past');
      expect(result).toEqual(bookings);
    });

    it('returns empty array when no past bookings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await bookingsApi.listPast();

      expect(result).toEqual([]);
    });
  });

  describe('deleteBooking', () => {
    it('deletes a booking', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await bookingsApi.deleteBooking('b1');

      expect(mockFetch).toHaveBeenCalledWith('/api/bookings/b1', { method: 'DELETE' });
    });

    it('throws ApiError on failed delete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Booking not found' }),
      });

      await expect(bookingsApi.deleteBooking('invalid')).rejects.toThrow(ApiError);
    });

    it('handles JSON parse error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(bookingsApi.deleteBooking('b1')).rejects.toThrow(ApiError);
    });
  });

  describe('ApiError', () => {
    it('extends Error', () => {
      const error = new ApiError('Test error', 400);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.name).toBe('ApiError');
    });
  });
});
