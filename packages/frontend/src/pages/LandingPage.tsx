import { Clock, Calendar, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { EventType } from '@app/api';
import { eventTypesApi } from '../api/eventTypes';
import { Navbar } from '../components/Navbar';

export function LandingPage() {
  const { t } = useTranslation();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eventTypesApi
      .list()
      .then(setEventTypes)
      .catch((err) => setError(err instanceof Error ? err.message : t('landing.errorLoading')))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <main
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          paddingTop: 64,
          paddingBottom: 96,
        }}
      >
        {/* Hero */}
        <h1
          style={{
            fontFamily: 'var(--font)',
            fontWeight: 700,
            fontSize: 'clamp(2rem, 4vw + 1rem, 3.5rem)',
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            color: 'var(--fg)',
            marginTop: 20,
            marginBottom: 8,
            animation: 'fadeUp 0.45s ease both',
            animationDelay: '0ms',
          }}
        >
          {t('landing.heroLine1')}
          <br />
          {t('landing.heroLine2')}
        </h1>

        <div
          style={{
            animation: 'fadeUp 0.45s ease both',
            animationDelay: '80ms',
            marginTop: 80,
            marginBottom: 16,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--accent)',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.09em',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              fontFamily: 'var(--font)',
            }}
          >
            <Zap size={11} strokeWidth={2.5} />
            {t('landing.meetingFormatBadge')}
          </span>
        </div>

        {/* Content */}
        {loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 200,
              animation: 'fadeUp 0.45s ease both',
              animationDelay: '160ms',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.75s linear infinite',
              }}
            />
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: '16px 20px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 10,
              fontFamily: 'var(--font)',
              fontSize: 14,
              color: '#dc2626',
              animation: 'fadeUp 0.45s ease both',
              animationDelay: '160ms',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && eventTypes.length === 0 && (
          <div
            data-testid="empty-state"
            style={{
              textAlign: 'center',
              padding: '80px 24px',
              border: '1px dashed var(--border)',
              borderRadius: 16,
              animation: 'fadeUp 0.45s ease both',
              animationDelay: '160ms',
              maxWidth: 760,
              margin: '0 auto',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: 'var(--accent)',
                borderRadius: 16,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Calendar size={28} color="white" strokeWidth={1.75} />
            </div>
            <p
              style={{
                fontFamily: 'var(--font)',
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
                margin: 0,
                marginBottom: 8,
              }}
            >
              {t('landing.emptyTitle')}
            </p>
            <p
              style={{
                fontFamily: 'var(--font)',
                fontSize: 14,
                color: 'var(--fg-muted)',
                margin: 0,
              }}
            >
              {t('landing.emptySubtitle')}
            </p>
          </div>
        )}

        {!loading && !error && eventTypes.length > 0 && (
          <div
            data-testid="event-types-list"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 20,
              animation: 'fadeUp 0.45s ease both',
              animationDelay: '160ms',
            }}
          >
            {eventTypes.map((et) => (
              <EventTypeCard key={et.id} eventType={et} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EventTypeCard({ eventType }: { eventType: EventType }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '24px 24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      }}
      className="event-card"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font)',
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '-0.03em',
            color: 'var(--fg)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {eventType.name}
        </h2>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font)',
            color: 'var(--fg-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          <Clock size={11} strokeWidth={2} />
          {t('landing.minutesSuffix', { count: eventType.durationMinutes })}
        </span>
      </div>

      {eventType.description && (
        <p
          style={{
            fontFamily: 'var(--font)',
            fontSize: 14,
            color: 'var(--fg-muted)',
            margin: 0,
            lineHeight: 1.5,
            flexGrow: 1,
          }}
        >
          {eventType.description}
        </p>
      )}

      <Link
        to={`/book?eventTypeId=${eventType.id}`}
        className="cta-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 'auto',
          padding: '11px 20px',
          background: 'var(--accent)',
          color: 'var(--accent-fg)',
          border: 'none',
          borderRadius: 8,
          fontFamily: 'var(--font)',
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: '-0.01em',
          cursor: 'pointer',
          textDecoration: 'none',
        }}
      >
        <Calendar size={15} strokeWidth={2} />
        {t('landing.bookButton')}
      </Link>
    </div>
  );
}
