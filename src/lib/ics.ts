/**
 * iCalendar (.ics) generator.
 *
 * Pure string builder — no external dependency. Apple Calendar, Google
 * Calendar, Outlook, Fastmail and most clients accept this format.
 *
 * Notes:
 *   - DTSTAMP/DTSTART/DTEND are emitted as UTC (`Z` suffix). This sidesteps
 *     the VTIMEZONE block, which is brittle to hand-author and not strictly
 *     needed since UTC is unambiguous.
 *   - Lines longer than 75 octets are folded per RFC 5545 §3.1.
 *   - Multi-line DESCRIPTION uses literal `\n` escapes per spec.
 */

export type IcsEvent = {
  uid: string; // stable, globally unique. Use the meeting id.
  startAt: Date;
  endAt: Date;
  summary: string;
  description?: string;
  location?: string; // Zoom join URL or "Phone" etc.
  organizer?: { name: string; email: string };
  attendees?: { name?: string; email: string }[];
  url?: string;
};

export function buildIcsEvent(event: IcsEvent): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CounselFlow//Scheduling//EN",
    "METHOD:REQUEST",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}@counselflow.app`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(event.startAt)}`,
    `DTEND:${formatUtc(event.endAt)}`,
    `SUMMARY:${escapeText(event.summary)}`,
  ];

  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);

  if (event.organizer) {
    lines.push(
      `ORGANIZER;CN=${escapeText(event.organizer.name)}:mailto:${event.organizer.email}`,
    );
  }

  for (const a of event.attendees ?? []) {
    const name = a.name ? `;CN=${escapeText(a.name)}` : "";
    lines.push(
      `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE${name}:mailto:${a.email}`,
    );
  }

  lines.push("STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT", "END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/**
 * Returns the .ics body and the matching Resend-style attachment payload
 * (base64-encoded).
 */
export function buildIcsAttachment(event: IcsEvent): {
  filename: string;
  contentType: string;
  content: string; // base64
  raw: string;
} {
  const raw = buildIcsEvent(event);
  return {
    filename: "invite.ics",
    contentType: "text/calendar; method=REQUEST; charset=UTF-8",
    content: Buffer.from(raw, "utf-8").toString("base64"),
    raw,
  };
}

function formatUtc(d: Date): string {
  // YYYYMMDDTHHMMSSZ
  const iso = d.toISOString();
  return iso.replace(/[-:]/g, "").replace(/\.\d+/, "");
}

function escapeText(s: string): string {
  // Per RFC 5545: backslash, comma, semicolon must be escaped; newlines → \n
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Line folding: lines must not exceed 75 octets; continuation lines start
 * with a single whitespace. Splitting on octets (not codepoints) matters for
 * non-ASCII content; we approximate with byte length.
 */
function foldLine(line: string): string {
  const max = 73; // 75 - 2 for CRLF safety; conservative
  if (Buffer.byteLength(line, "utf-8") <= max) return line;

  const out: string[] = [];
  let buf = "";
  for (const char of line) {
    const candidate = buf + char;
    if (Buffer.byteLength(candidate, "utf-8") > max) {
      out.push(buf);
      buf = " " + char; // leading whitespace marks continuation
    } else {
      buf = candidate;
    }
  }
  if (buf) out.push(buf);
  return out.join("\r\n");
}
