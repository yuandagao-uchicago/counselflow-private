/**
 * Parse a VTT (WebVTT) transcript file into readable plain text.
 * Handles Zoom, Google Meet, Teams, Otter, and other VTT exports.
 *
 * Input example:
 *   WEBVTT
 *
 *   1
 *   00:00:01.000 --> 00:00:04.000
 *   Sarah Johnson: Hi, thanks for making time today.
 *
 *   2
 *   00:00:04.500 --> 00:00:07.200
 *   Counselor: Of course. Let's talk about your UC essay.
 *
 * Output:
 *   Sarah Johnson: Hi, thanks for making time today.
 *   Counselor: Of course. Let's talk about your UC essay.
 */
export function parseVTT(vtt: string): string {
  // Strip BOM and normalize line endings
  const normalized = vtt.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  const textLines: string[] = [];
  let lastSpeaker: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty lines, header, NOTE blocks, cue numbers, and timestamp lines
    if (!line) continue;
    if (line === "WEBVTT" || line.startsWith("WEBVTT ")) continue;
    if (line.startsWith("NOTE")) continue;
    if (/^\d+$/.test(line)) continue; // cue number
    if (line.includes("-->")) continue; // timestamp
    if (line.startsWith("STYLE") || line.startsWith("REGION")) continue;

    // Strip VTT voice tags like <v Speaker Name>text</v>
    const voiceMatch = line.match(/^<v\s+([^>]+)>(.+?)(?:<\/v>)?$/);
    if (voiceMatch) {
      const speaker = voiceMatch[1].trim();
      const text = voiceMatch[2].trim();
      if (speaker && speaker !== lastSpeaker) {
        textLines.push(`${speaker}: ${text}`);
        lastSpeaker = speaker;
      } else {
        textLines.push(text);
      }
      continue;
    }

    // Strip any inline HTML/VTT styling tags
    const cleaned = line.replace(/<[^>]+>/g, "").trim();
    if (!cleaned) continue;

    // Detect "Speaker Name: text" prefix to collapse consecutive same-speaker lines
    const speakerMatch = cleaned.match(/^([A-Z][A-Za-z0-9 '.-]{0,40}):\s*(.+)$/);
    if (speakerMatch) {
      const speaker = speakerMatch[1].trim();
      if (speaker === lastSpeaker) {
        textLines.push(speakerMatch[2].trim());
      } else {
        textLines.push(cleaned);
        lastSpeaker = speaker;
      }
    } else {
      textLines.push(cleaned);
    }
  }

  return textLines.join("\n");
}
