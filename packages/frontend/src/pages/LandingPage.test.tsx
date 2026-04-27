import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventType } from '@app/api';
import i18n from '../i18n';
import * as eventTypesModule from '../api/eventTypes';
import { LandingPage } from './LandingPage';

vi.mock('../api/eventTypes', () => ({
  eventTypesApi: {
    list: vi.fn(),
  },
}));

const mockEventTypes: EventType[] = [
  {
    id: '1',
    name: 'Consultation 30 min',
    description: 'Short online meeting',
    durationMinutes: 30,
  },
  {
    id: '2',
    name: 'Strategic session',
    description: '',
    durationMinutes: 60,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('en');
  });

  it('shows list of event type cards', async () => {
    vi.mocked(eventTypesModule.eventTypesApi.list).mockResolvedValue(mockEventTypes);

    renderPage();

    const list = await screen.findByTestId('event-types-list');
    expect(list).toBeInTheDocument();

    expect(screen.getByText('Consultation 30 min')).toBeInTheDocument();
    expect(screen.getByText('Short online meeting')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();

    expect(screen.getByText('Strategic session')).toBeInTheDocument();
    expect(screen.getByText('60 min')).toBeInTheDocument();
  });

  it('"Book" buttons link to /book?eventTypeId=<id>', async () => {
    vi.mocked(eventTypesModule.eventTypesApi.list).mockResolvedValue(mockEventTypes);

    renderPage();

    await screen.findByTestId('event-types-list');

    const links = screen.getAllByRole('link', { name: /book/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/book?eventTypeId=1');
    expect(links[1]).toHaveAttribute('href', '/book?eventTypeId=2');
  });

  it('shows empty state when there are no event types', async () => {
    vi.mocked(eventTypesModule.eventTypesApi.list).mockResolvedValue([]);

    renderPage();

    const empty = await screen.findByTestId('empty-state');
    expect(empty).toBeInTheDocument();
    expect(screen.getByText(/no meeting formats available/i)).toBeInTheDocument();
  });
});
