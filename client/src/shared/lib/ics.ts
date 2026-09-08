import type { Booking } from '../api/contracts';

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function stamp(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function downloadBookingIcs(booking: Booking): void {
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BookRoom//Meeting Room Booking//RU',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@bookroom.local`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(booking.startsAt)}`,
    `DTEND:${stamp(booking.endsAt)}`,
    `SUMMARY:${escapeIcs(booking.title)}`,
    `LOCATION:${escapeIcs(`${booking.office.name}, ${booking.room.name}`)}`,
    ...(booking.comment ? [`DESCRIPTION:${escapeIcs(booking.comment)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `booking-${booking.id}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
