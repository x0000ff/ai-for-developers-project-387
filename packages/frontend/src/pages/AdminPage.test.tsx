import { MantineProvider } from '@mantine/core';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Booking, EventType } from '@app/api';
import i18n from '../i18n';
import * as eventTypesModule from '../api/eventTypes';
import * as bookingsModule from '../api/bookings';
import { AdminPage } from './AdminPage';

vi.mock('../api/eventTypes', () => ({
  eventTypesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api/bookings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/bookings')>();
  return {
    ...actual,
    bookingsApi: {
      getSlots: vi.fn(),
      createBooking: vi.fn(),
      listUpcoming: vi.fn(),
      deleteBooking: vi.fn(),
    },
  };
});

const mockEventTypes: EventType[] = [
  { id: '1', name: 'Consultation', description: '', durationMinutes: 30 },
];

const mockBookings: Booking[] = [
  {
    id: 'b1',
    eventTypeId: '1',
    eventTypeName: 'Consultation',
    startsAt: '2026-04-10T10:00:00.000Z',
    endsAt: '2026-04-10T10:30:00.000Z',
    guestName: 'Ivan Ivanov',
    guestEmail: 'ivan@example.com',
  },
  {
    id: 'b2',
    eventTypeId: null,
    eventTypeName: 'Deleted Type',
    startsAt: '2026-04-11T12:00:00.000Z',
    endsAt: '2026-04-11T13:00:00.000Z',
    guestName: 'Maria Petrova',
    guestEmail: 'maria@example.com',
  },
];

function renderPage() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe('AdminPage — upcoming meetings section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('en');
    vi.mocked(eventTypesModule.eventTypesApi.list).mockResolvedValue(mockEventTypes);
  });

  it('displays bookings table with guest data', async () => {
    vi.mocked(bookingsModule.bookingsApi.listUpcoming).mockResolvedValue(mockBookings);

    renderPage();

    const table = await screen.findByTestId('bookings-table');
    expect(table).toBeInTheDocument();

    const t = within(table);
    expect(t.getByText('Ivan Ivanov')).toBeInTheDocument();
    expect(t.getByText('ivan@example.com')).toBeInTheDocument();
    expect(t.getByText('Consultation')).toBeInTheDocument();

    expect(t.getByText('Maria Petrova')).toBeInTheDocument();
    expect(t.getByText('maria@example.com')).toBeInTheDocument();
  });

  it('shows "Type deleted" badge when eventTypeId === null', async () => {
    vi.mocked(bookingsModule.bookingsApi.listUpcoming).mockResolvedValue(mockBookings);

    renderPage();

    await screen.findByTestId('bookings-table');

    const badges = screen.getAllByTestId('deleted-type-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent('Type deleted');
  });

  it('shows empty state when there are no bookings', async () => {
    vi.mocked(bookingsModule.bookingsApi.listUpcoming).mockResolvedValue([]);

    renderPage();

    const empty = await screen.findByTestId('bookings-empty');
    expect(empty).toBeInTheDocument();
    expect(screen.getByText(/no upcoming bookings/i)).toBeInTheDocument();
  });

  it('delete icon is displayed in bookings table', async () => {
    vi.mocked(bookingsModule.bookingsApi.listUpcoming).mockResolvedValue(mockBookings);

    renderPage();

    const table = await screen.findByTestId('bookings-table');
    const deleteButtons = within(table).getAllByTitle('Delete booking');
    expect(deleteButtons).toHaveLength(mockBookings.length);
  });

  it('clicking delete icon opens confirmation modal', async () => {
    vi.mocked(bookingsModule.bookingsApi.listUpcoming).mockResolvedValue(mockBookings);

    renderPage();

    const table = await screen.findByTestId('bookings-table');
    const deleteButtons = within(table).getAllByTitle('Delete booking');
    fireEvent.click(deleteButtons[0]);

    expect(await screen.findByText('Delete booking')).toBeInTheDocument();
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });

  it('confirming deletion calls deleteBooking and updates list', async () => {
    vi.mocked(bookingsModule.bookingsApi.listUpcoming).mockResolvedValue(mockBookings);
    vi.mocked(bookingsModule.bookingsApi.deleteBooking).mockResolvedValue(undefined);

    renderPage();

    const table = await screen.findByTestId('bookings-table');
    const deleteButtons = within(table).getAllByTitle('Delete booking');
    fireEvent.click(deleteButtons[0]);

    const confirmBtn = await screen.findByTestId('delete-booking-confirm');
    fireEvent.click(confirmBtn);

    expect(bookingsModule.bookingsApi.deleteBooking).toHaveBeenCalledWith(mockBookings[0].id);
  });

  it('canceling in modal does not call deleteBooking', async () => {
    vi.mocked(bookingsModule.bookingsApi.listUpcoming).mockResolvedValue(mockBookings);

    renderPage();

    const table = await screen.findByTestId('bookings-table');
    const deleteButtons = within(table).getAllByTitle('Delete booking');
    fireEvent.click(deleteButtons[0]);

    const cancelBtn = await screen.findByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(bookingsModule.bookingsApi.deleteBooking).not.toHaveBeenCalled();
  });
});
