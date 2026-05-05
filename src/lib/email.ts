/**
 * Outbound email — Resend wrapper.
 *
 * If RESEND_API_KEY is not set, send() warns and returns { sent: false } instead
 * of throwing. This keeps the dev experience smooth before keys are wired,
 * while making the silence loud enough to notice.
 *
 * `from` defaults to a generic noreply on a Resend-managed sandbox domain in
 * dev. In production, set RESEND_FROM to a verified domain address (e.g.
 * "Yuanda <noreply@counselflow.app>").
 */
import { Resend } from "resend";

let _client: Resend | null = null;
function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_client) _client = new Resend(key);
  return _client;
}

export function defaultFrom(): string {
  return (
    process.env.RESEND_FROM ||
    "CounselFlow <onboarding@resend.dev>" // resend.dev is a sandbox; works without DNS
  );
}

export type EmailAttachment = {
  filename: string;
  content: string; // base64-encoded
  contentType?: string;
};

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export type SendResult = { sent: true; id: string } | { sent: false; reason: string };

export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  const r = client();
  if (!r) {
    // Log subject only — avoid dumping full email body or recipient PII.
    console.warn(
      "[email] RESEND_API_KEY not set — email NOT sent. Subject:",
      params.subject,
    );
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const res = await r.emails.send({
    from: defaultFrom(),
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
    ...(params.cc && { cc: Array.isArray(params.cc) ? params.cc : [params.cc] }),
    ...(params.replyTo && { replyTo: params.replyTo }),
    ...(params.attachments && {
      attachments: params.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    }),
  });

  if (res.error) {
    console.error("[email] Resend error:", res.error);
    return { sent: false, reason: res.error.message };
  }
  return { sent: true, id: res.data?.id ?? "unknown" };
}

// ---------- Email templates ----------

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(content: string): string {
  // Light-mode email — Gmail and most clients enforce light backgrounds
  // regardless of declared dark themes, so white-on-dark inevitably breaks.
  // Keep colors high-contrast and explicit on every text node so dark-mode
  // overrides in supportive clients still produce readable output.
  return `<!doctype html>
<html><head>
  <meta charset="utf-8" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111114;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f5f5f7" style="background-color:#f5f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="max-width:560px;background-color:#111114fff;border:1px solid #e6e6ea;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:24px 28px 8px 28px;">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td bgcolor="#7c5cff" style="background-color:#7c5cff;background-image:linear-gradient(135deg,#7c5cff,#9d6bff);width:28px;height:28px;border-radius:8px;">&nbsp;</td>
              <td style="padding-left:10px;font-weight:700;letter-spacing:-0.01em;color:#111114;font-size:15px;">CounselFlow</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 28px 28px 28px;color:#111114;">${content}</td></tr>
      </table>
      <p style="font-size:11px;color:#86868b;margin-top:16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
        Sent by your college counselor via CounselFlow.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

export function buildMeetingRequestEmail(args: {
  studentFirstName: string;
  counselorName: string;
  meetingType: string;
  durationMins: number;
  message?: string | null;
  token: string;
  slots: { startAt: Date }[];
  timezone: string;
}): { subject: string; html: string; text: string } {
  const link = `${appBaseUrl()}/respond/${args.token}`;
  const slotList = args.slots
    .map((s) => formatSlotForEmail(s.startAt, args.timezone))
    .map((s) => `<li style="margin:4px 0;">${s}</li>`)
    .join("");

  const html = shell(`
    <h1 style="font-size:20px;font-weight:700;margin:8px 0 16px 0;color:#111114;">
      Hi ${escapeHtml(args.studentFirstName)},
    </h1>
    <p style="font-size:14px;line-height:1.6;color:#3a3a3f;margin:0 0 14px 0;">
      ${escapeHtml(args.counselorName)} would like to schedule a
      <strong style="color:#111114;">${args.durationMins}-minute ${escapeHtml(args.meetingType)}</strong>
      with you.
    </p>
    ${
      args.message
        ? `<table role="presentation" cellspacing="0" cellpadding="0" bgcolor="#f6f5ff" style="background-color:#f6f5ff;border-left:3px solid #7c5cff;border-radius:6px;width:100%;margin:14px 0;"><tr><td style="padding:10px 14px;color:#3a3a3f;font-size:13px;line-height:1.6;">${escapeHtml(args.message)}</td></tr></table>`
        : ""
    }
    <p style="font-size:14px;color:#3a3a3f;margin:18px 0 8px 0;">Proposed times:</p>
    <ul style="font-size:14px;color:#3a3a3f;padding-left:18px;margin:0 0 22px 0;">${slotList}</ul>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 16px 0;">
      <tr><td bgcolor="#7c5cff" style="background-color:#7c5cff;background-image:linear-gradient(135deg,#7c5cff,#9d6bff);border-radius:10px;">
        <a href="${link}" style="display:inline-block;padding:14px 28px;color:#111114fff;text-decoration:none;font-weight:700;font-size:15px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;line-height:1;">
          Pick a time &rarr;
        </a>
      </td></tr>
    </table>
    <p style="font-size:12px;color:#6b6b73;margin:8px 0 0 0;line-height:1.5;">
      Or copy this link into your browser:<br/>
      <a href="${link}" style="color:#9d6bff;word-break:break-all;">${link}</a>
    </p>
    <p style="font-size:11px;color:#6b6b73;margin:14px 0 0 0;">The link expires in 14 days.</p>
  `);

  const text = [
    `Hi ${args.studentFirstName},`,
    ``,
    `${args.counselorName} would like to schedule a ${args.durationMins}-minute ${args.meetingType} with you.`,
    args.message ? `\n${args.message}\n` : "",
    `Proposed times:`,
    ...args.slots.map((s) => `  • ${formatSlotForEmail(s.startAt, args.timezone, false)}`),
    ``,
    `Pick a time or propose an alternative: ${link}`,
    `(Link expires in 14 days.)`,
  ].join("\n");

  return {
    subject: `${args.counselorName} would like to meet`,
    html,
    text,
  };
}

export function buildConfirmationEmail(args: {
  studentFirstName: string;
  counselorName: string;
  meetingType: string;
  durationMins: number;
  startAt: Date;
  meetingUrl: string | null;
  timezone: string;
}): { subject: string; html: string; text: string } {
  const when = formatSlotForEmail(args.startAt, args.timezone);

  const html = shell(`
    <h1 style="font-size:20px;font-weight:700;margin:8px 0 16px 0;color:#111114;">You&rsquo;re confirmed ✨</h1>
    <p style="font-size:14px;color:#3a3a3f;line-height:1.6;margin:0 0 18px 0;">
      Hi ${escapeHtml(args.studentFirstName)} — your <strong style="color:#111114;">${args.durationMins}-minute ${escapeHtml(args.meetingType)}</strong> with
      ${escapeHtml(args.counselorName)} is locked in.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" bgcolor="#f6f5ff" style="background-color:#f6f5ff;border:1px solid #e3def9;border-radius:12px;width:100%;margin:0 0 18px 0;">
      <tr><td style="padding:16px 18px;">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b6b73;margin:0 0 6px 0;">When</p>
        <p style="font-size:15px;color:#111114;font-weight:600;margin:0;">${when}</p>
      </td></tr>
      ${
        args.meetingUrl
          ? `<tr><td style="padding:0 18px 16px 18px;">
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b6b73;margin:14px 0 6px 0;">Join link</p>
              <a href="${args.meetingUrl}" style="font-size:14px;color:#9d6bff;word-break:break-all;">${escapeHtml(args.meetingUrl)}</a>
            </td></tr>`
          : ""
      }
    </table>
    ${
      args.meetingUrl
        ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0;">
            <tr><td bgcolor="#7c5cff" style="background-color:#7c5cff;background-image:linear-gradient(135deg,#7c5cff,#9d6bff);border-radius:10px;">
              <a href="${args.meetingUrl}" style="display:inline-block;padding:14px 28px;color:#111114fff;text-decoration:none;font-weight:700;font-size:15px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;line-height:1;">
                Join meeting
              </a>
            </td></tr>
           </table>`
        : ""
    }
    <p style="font-size:12px;color:#6b6b73;margin:14px 0 0 0;">A calendar invite is attached.</p>
  `);

  const text = [
    `Hi ${args.studentFirstName},`,
    ``,
    `Your ${args.durationMins}-minute ${args.meetingType} with ${args.counselorName} is confirmed.`,
    `When: ${when}`,
    args.meetingUrl ? `Join: ${args.meetingUrl}` : "",
    ``,
    `A calendar invite is attached.`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Confirmed: ${args.meetingType} with ${args.counselorName}`,
    html,
    text,
  };
}

export function buildCounterAcknowledgementEmail(args: {
  studentFirstName: string;
  counselorName: string;
  proposedAt: Date;
  timezone: string;
}): { subject: string; html: string; text: string } {
  const when = formatSlotForEmail(args.proposedAt, args.timezone);

  const html = shell(`
    <h1 style="font-size:20px;font-weight:700;margin:8px 0 16px 0;color:#111114;">Got it — sent to ${escapeHtml(args.counselorName)}</h1>
    <p style="font-size:14px;color:#3a3a3f;line-height:1.6;">
      Thanks ${escapeHtml(args.studentFirstName)}. We&rsquo;ll let ${escapeHtml(args.counselorName)} know you proposed
      <strong style="color:#111114;">${when}</strong>. You&rsquo;ll get another email once they confirm or counter-propose.
    </p>
  `);

  const text = `Thanks ${args.studentFirstName}. We'll let ${args.counselorName} know you proposed ${when}.`;

  return {
    subject: `Sent to ${args.counselorName}`,
    html,
    text,
  };
}

// ---------- Time formatting ----------

function formatSlotForEmail(d: Date, timezone: string, includeWeekday = true): string {
  // Lean on Intl rather than date-fns for tz support; works in any Node runtime.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: includeWeekday ? "long" : undefined,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}
