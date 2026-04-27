import type { EventType, CreateEventTypeRequest, UpdateEventTypeRequest } from '@app/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }
  return response.json();
}

export const eventTypesApi = {
  list: async (): Promise<EventType[]> => {
    const response = await fetch(`${API_BASE_URL}/api/event-types`);
    return handleResponse<EventType[]>(response);
  },

  create: async (data: CreateEventTypeRequest): Promise<EventType> => {
    const response = await fetch(`${API_BASE_URL}/api/event-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<EventType>(response);
  },

  update: async (id: string, data: UpdateEventTypeRequest): Promise<EventType> => {
    const response = await fetch(`${API_BASE_URL}/api/event-types/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<EventType>(response);
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/event-types/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
  },
};
