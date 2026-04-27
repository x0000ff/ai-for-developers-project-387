import type { Booking, CreateBookingRequest, Slot } from '@app/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new ApiError(data.message || `API error: ${response.status}`, response.status);
  }
  return response.json();
}

export const bookingsApi = {
  getSlots: async (eventTypeId: string, date: string): Promise<Slot[]> => {
    const response = await fetch(
      `${API_BASE_URL}/api/event-types/${eventTypeId}/slots?date=${date}`,
    );
    return handleResponse<Slot[]>(response);
  },

  createBooking: async (data: CreateBookingRequest): Promise<Booking> => {
    const response = await fetch(`${API_BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Booking>(response);
  },

  listUpcoming: async (): Promise<Booking[]> => {
    const response = await fetch(`${API_BASE_URL}/api/bookings`);
    return handleResponse<Booking[]>(response);
  },

  listPast: async (): Promise<Booking[]> => {
    const response = await fetch(`${API_BASE_URL}/api/bookings/past`);
    return handleResponse<Booking[]>(response);
  },

  deleteBooking: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/bookings/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new ApiError(data.message || `API error: ${response.status}`, response.status);
    }
  },
};
