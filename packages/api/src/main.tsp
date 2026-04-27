import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@service({ title: "Book a call API" })
namespace BookACall;

/** Generic error response body */
model ErrorResponse {
  message: string;
}

/** A single available time slot */
model Slot {
  startsAt: utcDateTime;
  endsAt: utcDateTime;
}

/** Represents a meeting type that guests can book */
model EventType {
  id: string;
  name: string;
  description: string;
  durationMinutes: int32;
}

/** Request body for creating a new event type */
model CreateEventTypeRequest {
  name: string;
  description?: string;
  durationMinutes: int32;
}

/** Request body for fully replacing an event type */
model UpdateEventTypeRequest {
  name: string;
  description?: string;
  durationMinutes: int32;
}

/** A confirmed booking */
model Booking {
  id: string;
  eventTypeId: string | null;
  eventTypeName: string;
  startsAt: utcDateTime;
  endsAt: utcDateTime;
  guestName: string;
  guestEmail: string;
}

/** Request body for creating a new booking */
model CreateBookingRequest {
  eventTypeId: string;
  startsAt: utcDateTime;
  guestName: string;
  guestEmail: string;
}

@route("/api/bookings")
interface Bookings {
  /** Create a booking; 400 if past, 404 if unknown eventType, 409 if conflict */
  @post create(@body body: CreateBookingRequest):
    | { @statusCode statusCode: 201; @body body: Booking; }
    | { @statusCode statusCode: 400; @body body: ErrorResponse; }
    | { @statusCode statusCode: 404; @body body: ErrorResponse; }
    | { @statusCode statusCode: 409; @body body: ErrorResponse; };

  /** List upcoming bookings sorted by startsAt ASC */
  @get list(): Booking[];

  /** List past bookings sorted by startsAt DESC */
  @route("past")
  @get listPast(): Booking[];

  /** Delete a booking by id */
  @route("{id}")
  @delete delete(@path id: string):
    | { @statusCode _: 204 }
    | { @statusCode _: 404; message: string };
}

@route("/api/event-types")
interface EventTypes {
  /** List all event types */
  @get list(): EventType[];

  /** Get a single event type by id */
  @get get(@path id: string): EventType | NotFoundResponse;

  /** Create a new event type */
  @post create(@body body: CreateEventTypeRequest): {
    @statusCode statusCode: 201;
    @body body: EventType;
  };

  /** Fully replace an existing event type */
  @put update(@path id: string, @body body: UpdateEventTypeRequest):
    | EventType
    | NotFoundResponse;

  /** Delete an event type (does not delete related bookings) */
  @delete delete(@path id: string): {
    @statusCode statusCode: 204;
  } | NotFoundResponse;

  /** List available slots for an event type on a given date; 400 if invalid/too far date, 404 if event type not found */
  @get @route("{id}/slots") slots(@path id: string, @query date: string):
    | Slot[]
    | { @statusCode statusCode: 400; @body body: ErrorResponse; }
    | NotFoundResponse;
}
