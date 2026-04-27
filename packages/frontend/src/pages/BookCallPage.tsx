import { Calendar as CalendarIcon, Check, ChevronDown, Clock, Mail, User } from 'lucide-react';
import { Calendar } from '@mantine/dates';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Booking, EventType, Slot } from '@app/api';
import { bookingsApi, ApiError } from '../api/bookings';
import { eventTypesApi } from '../api/eventTypes';
import { Navbar } from '../components/Navbar';
import { getLocale } from '../utils/locale';

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const today = toLocalDateString(new Date());

function formatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function BookCallPage() {
  const { t, i18n } = useTranslation();
  const locale = getLocale(i18n.language);
  const [searchParams] = useSearchParams();
  const initialEventTypeId = searchParams.get('eventTypeId') ?? '';

  // Calculate max date (only allow bookings up to 14 days from now)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 14);

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [eventTypesLoading, setEventTypesLoading] = useState(true);

  const [selectedEventTypeId, setSelectedEventTypeId] = useState(initialEventTypeId);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);

  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    eventTypesApi
      .list()
      .then(setEventTypes)
      .finally(() => setEventTypesLoading(false));
  }, []);

  useEffect(() => {
    setSelectedSlot(null);
    setSubmitError(null);
    setIsConflict(false);

    const dateStr = selectedDate ? toLocalDateString(selectedDate) : '';

    if (!selectedEventTypeId || !dateStr) {
      setSlots([]);
      return;
    }

    setSlotsLoading(true);
    setSlotsError(null);

    bookingsApi
      .getSlots(selectedEventTypeId, dateStr)
      .then(setSlots)
      .catch((err) =>
        setSlotsError(err instanceof Error ? err.message : t('bookCall.errorLoadingSlots')),
      )
      .finally(() => setSlotsLoading(false));
  }, [selectedEventTypeId, selectedDate, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot || !selectedEventTypeId) return;

    setSubmitting(true);
    setSubmitError(null);
    setIsConflict(false);

    try {
      const result = await bookingsApi.createBooking({
        eventTypeId: selectedEventTypeId,
        startsAt: selectedSlot.startsAt,
        guestName,
        guestEmail,
      });
      setBooking(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setIsConflict(true);
        setSelectedSlot(null);
        setSlotsLoading(true);
        bookingsApi
          .getSlots(selectedEventTypeId, selectedDate ? toLocalDateString(selectedDate) : '')
          .then(setSlots)
          .catch(() => {})
          .finally(() => setSlotsLoading(false));
      } else {
        setSubmitError(err instanceof Error ? err.message : t('bookCall.errorBooking'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const selectedEventType = eventTypes.find((et) => et.id === selectedEventTypeId);

  if (booking) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <main
          style={{
            maxWidth: 640,
            margin: '0 auto',
            padding: '64px 24px 96px',
          }}
        >
          <div
            data-testid="booking-confirmation"
            style={{
              background: 'white',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '40px 32px',
              textAlign: 'center',
              animation: 'fadeUp 0.45s ease both',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: 'var(--accent)',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Check size={28} color="white" strokeWidth={2.5} />
            </div>

            <h1
              style={{
                fontFamily: 'var(--font)',
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: '-0.04em',
                color: 'var(--fg)',
                marginBottom: 8,
              }}
            >
              {t('bookCall.confirmTitle')}
            </h1>
            <p
              style={{
                fontFamily: 'var(--font)',
                fontSize: 15,
                color: 'var(--fg-muted)',
                marginBottom: 32,
              }}
            >
              {t('bookCall.confirmSubtitle')}
            </p>

            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '20px 24px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                marginBottom: 32,
              }}
            >
              <ConfirmRow
                icon={<CalendarIcon size={15} strokeWidth={2} />}
                label={booking.eventTypeName}
              />
              <ConfirmRow
                icon={<Clock size={15} strokeWidth={2} />}
                label={`${formatDate(booking.startsAt, locale)}, ${formatTime(booking.startsAt, locale)} — ${formatTime(booking.endsAt, locale)}`}
              />
              <ConfirmRow icon={<User size={15} strokeWidth={2} />} label={booking.guestName} />
              <ConfirmRow icon={<Mail size={15} strokeWidth={2} />} label={booking.guestEmail} />
            </div>

            <Link
              to="/"
              className="cta-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                background: 'var(--accent)',
                color: 'var(--accent-fg)',
                borderRadius: 8,
                fontFamily: 'var(--font)',
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: '-0.01em',
                textDecoration: 'none',
              }}
            >
              {t('bookCall.confirmBackHome')}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <main
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '64px 24px 96px',
        }}
      >
        <div style={{ animation: 'fadeUp 0.45s ease both', marginBottom: 24 }}>
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
            <CalendarIcon size={11} strokeWidth={2.5} />
            {t('bookCall.badge')}
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font)',
            fontWeight: 700,
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            letterSpacing: '-0.04em',
            color: 'var(--fg)',
            marginBottom: 40,
            animation: 'fadeUp 0.45s ease both',
            animationDelay: '80ms',
          }}
        >
          {t('bookCall.pageTitle')}
        </h1>

        <div
          style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
            animation: 'fadeUp 0.45s ease both',
            animationDelay: '160ms',
          }}
        >
          {/* Event type select */}
          <Section
            label={t('bookCall.sectionEventType')}
            icon={<CalendarIcon size={15} strokeWidth={2} />}
          >
            {eventTypesLoading ? (
              <Spinner />
            ) : (
              <div style={{ position: 'relative' }}>
                <select
                  data-testid="event-type-select"
                  value={selectedEventTypeId}
                  onChange={(e) => setSelectedEventTypeId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">{t('bookCall.selectPlaceholder')}</option>
                  {eventTypes.map((et) => (
                    <option key={et.id} value={et.id}>
                      {t('bookCall.eventTypeOption', {
                        duration: et.durationMinutes,
                        name: et.name,
                      })}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  strokeWidth={2}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--fg-muted)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            )}
          </Section>

          <Divider />

          {/* Date picker */}
          <Section
            label={t('bookCall.sectionDate')}
            icon={<CalendarIcon size={15} strokeWidth={2} />}
          >
            <div
              style={{
                opacity: selectedEventTypeId ? 1 : 0.5,
                pointerEvents: selectedEventTypeId ? 'auto' : 'none',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Calendar
                locale={i18n.language}
                minDate={new Date(today)}
                maxDate={maxDate}
                getDayProps={(date) => ({
                  selected:
                    selectedDate !== null && date.toDateString() === selectedDate.toDateString(),
                  onClick: () =>
                    setSelectedDate((prev) =>
                      prev?.toDateString() === date.toDateString() ? null : date,
                    ),
                })}
              />
            </div>
          </Section>

          {/* Slots */}
          {selectedEventTypeId && selectedDate && (
            <>
              <Divider />
              <Section label={t('bookCall.sectionTime')} icon={<Clock size={15} strokeWidth={2} />}>
                {slotsLoading && <Spinner />}

                {!slotsLoading && slotsError && <p style={errorTextStyle}>{slotsError}</p>}

                {isConflict && (
                  <div data-testid="conflict-error" style={conflictStyle}>
                    {t('bookCall.conflictError')}
                  </div>
                )}

                {!slotsLoading && !slotsError && slots.length === 0 && (
                  <p
                    style={{
                      fontFamily: 'var(--font)',
                      fontSize: 14,
                      color: 'var(--fg-muted)',
                    }}
                  >
                    {t('bookCall.noSlotsAvailable')}
                  </p>
                )}

                {!slotsLoading && !slotsError && slots.length > 0 && (
                  <div
                    data-testid="slots-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
                      gap: 8,
                    }}
                  >
                    {slots.map((slot) => {
                      const slotTime = formatTime(slot.startsAt, locale);
                      const isSelected = selectedSlot?.startsAt === slot.startsAt;
                      return (
                        <button
                          key={slot.startsAt}
                          data-testid={`slot-${slot.startsAt}`}
                          onClick={() => {
                            setSelectedSlot(isSelected ? null : slot);
                            setSubmitError(null);
                          }}
                          style={{
                            fontFamily: 'var(--font)',
                            fontSize: 13,
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            padding: '8px 0',
                            borderRadius: 8,
                            border: isSelected
                              ? '2px solid var(--accent)'
                              : '1px solid var(--border)',
                            background: isSelected ? 'var(--accent)' : 'transparent',
                            color: isSelected ? 'var(--accent-fg)' : 'var(--fg)',
                            cursor: 'pointer',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          {slotTime}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Section>
            </>
          )}

          {/* Booking form */}
          {selectedSlot && selectedEventType && (
            <>
              <Divider />
              <Section
                label={t('bookCall.sectionYourDetails')}
                icon={<User size={15} strokeWidth={2} />}
              >
                <div
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 16,
                    fontFamily: 'var(--font)',
                    fontSize: 13,
                    color: 'var(--fg-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Clock
                    size={13}
                    strokeWidth={2}
                    style={{ color: 'var(--accent)', flexShrink: 0 }}
                  />
                  {selectedEventType.name} · {formatTime(selectedSlot.startsAt, locale)} —{' '}
                  {formatTime(selectedSlot.endsAt, locale)}
                </div>

                <form
                  onSubmit={handleSubmit}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div>
                    <label style={labelStyle} htmlFor="guestName">
                      {t('bookCall.fieldName')}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User
                        size={14}
                        strokeWidth={2}
                        style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--fg-muted)',
                        }}
                      />
                      <input
                        id="guestName"
                        data-testid="guest-name-input"
                        type="text"
                        required
                        placeholder={t('bookCall.namePlaceholder')}
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: 36 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle} htmlFor="guestEmail">
                      {t('bookCall.fieldEmail')}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={14}
                        strokeWidth={2}
                        style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--fg-muted)',
                        }}
                      />
                      <input
                        id="guestEmail"
                        data-testid="guest-email-input"
                        type="email"
                        required
                        placeholder="your@email.com"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: 36 }}
                      />
                    </div>
                  </div>

                  {submitError && <p style={errorTextStyle}>{submitError}</p>}

                  <button
                    type="submit"
                    data-testid="submit-button"
                    disabled={submitting}
                    className="cta-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '13px 24px',
                      background: 'var(--accent)',
                      color: 'var(--accent-fg)',
                      border: 'none',
                      borderRadius: 8,
                      fontFamily: 'var(--font)',
                      fontWeight: 600,
                      fontSize: 14,
                      letterSpacing: '-0.01em',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                      marginTop: 4,
                    }}
                  >
                    {submitting ? (
                      <>
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            border: '2px solid rgba(255,255,255,0.4)',
                            borderTopColor: 'white',
                            borderRadius: '50%',
                            animation: 'spin 0.75s linear infinite',
                            display: 'inline-block',
                          }}
                        />
                        {t('bookCall.submitting')}
                      </>
                    ) : (
                      <>
                        <Check size={15} strokeWidth={2.5} />
                        {t('bookCall.submitBooking')}
                      </>
                    )}
                  </button>
                </form>
              </Section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: '24px 28px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginBottom: 14,
          fontFamily: 'var(--font)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
        }}
      >
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)' }} />;
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 36 }}>
      <div
        style={{
          width: 20,
          height: 20,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
        }}
      />
    </div>
  );
}

function ConfirmRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font)', fontSize: 14, color: 'var(--fg)' }}>{label}</span>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 36px 10px 14px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'white',
  fontFamily: 'var(--font)',
  fontSize: 14,
  color: 'var(--fg)',
  cursor: 'pointer',
  appearance: 'none',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'white',
  fontFamily: 'var(--font)',
  fontSize: 14,
  color: 'var(--fg)',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font)',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--fg-muted)',
  marginBottom: 6,
  letterSpacing: '-0.01em',
};

const errorTextStyle: React.CSSProperties = {
  fontFamily: 'var(--font)',
  fontSize: 13,
  color: '#dc2626',
};

const conflictStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 8,
  fontFamily: 'var(--font)',
  fontSize: 13,
  color: '#dc2626',
  marginBottom: 12,
};
