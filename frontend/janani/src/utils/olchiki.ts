/**
 * JANANI Ol Chiki Script Utilities
 * Unicode block for Ol Chiki is U+1C50 - U+1C7F
 */

export const OL_CHIKI_REGEX = /[\u1C50-\u1C7F]/g;

export function isValidOlChiki(text: string): boolean {
  if (!text || !text.trim()) return false;
  const matches = text.match(OL_CHIKI_REGEX);
  const olChikiCount = matches ? matches.length : 0;
  
  // Count non-whitespace letters/digits/symbols
  const totalLetters = text.replace(/\s+/g, '').length;
  if (totalLetters === 0) return false;

  // Primary school Santali phrases often have punctuation, numbers, or short words
  // Generous threshold to avoid rejecting valid short Santali output
  return (olChikiCount / totalLetters) >= 0.35;
}

export function countOlChikiChars(text: string): number {
  if (!text) return 0;
  const matches = text.match(OL_CHIKI_REGEX);
  return matches ? matches.length : 0;
}

export function formatOlChikiBadge(text: string): { valid: boolean; ratio: number } {
  if (!text || !text.trim()) return { valid: false, ratio: 0 };
  const matches = text.match(OL_CHIKI_REGEX);
  const count = matches ? matches.length : 0;
  const total = text.replace(/\s+/g, '').length;
  const ratio = total > 0 ? count / total : 0;
  return {
    valid: ratio >= 0.35,
    ratio: Math.round(ratio * 100),
  };
}
