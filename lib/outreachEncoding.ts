// lib/outreachEncoding.ts
// Mojibake detection for outreach email queue rows.
// Mojibake occurs when UTF-8 text is read by a parser that treats bytes as Windows-1252.
// The result is sequences like Ã¶ (ö), Ã¤ (ä), Ã¥ (å), Ã… (Å).
// If detected, run APPLY_NOW_FIX_OUTREACH_QUEUE_SWEDISH_ENCODING.sql before approving rows.

export const MOJIBAKE_SEQUENCES: readonly string[] = [
  'Ã¶', // ö
  'Ã¤', // ä
  'Ã¥', // å
  'Ã…', // Å
  'Ã©', // é
  'Ã¼', // ü
  'Ã',  // lone Ã prefix (catch-all for any missed Swedish sequence)
  'Â',  // lone  prefix (often appears alongside Ã sequences)
];

export function hasMojibake(text: string | null | undefined): boolean {
  if (!text) return false;
  return MOJIBAKE_SEQUENCES.some((seq) => text.includes(seq));
}
