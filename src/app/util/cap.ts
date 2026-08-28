/**
 * 2026-08-28 BUILD 137 (founder): "the elegance of presuming that the start of
 * a sentence is capped, if a letter." No user should painfully press CAPS at
 * the start of every intended sentence in a chat composer.
 *
 * Deliberately conservative:
 *  - ASCII [a-z] only → 1:1 char mapping (length NEVER changes), so caret
 *    restoration stays exact and German ß→SS / Turkish İ surprises can't
 *    happen. Caseless scripts (Arabic, Hebrew, Chinese...) pass through
 *    untouched — exactly the founder's "will not work well in some languages,
 *    but in English certainly".
 *  - Only two rules: the first letter of the whole text, and the first letter
 *    after [.!?] followed by whitespace. "3.5" and "e.g." mid-word stay put —
 *    the rule needs whitespace after the punctuation.
 */
export function capSentences(raw: string): string {
  if (!raw) return raw;
  return raw
    .replace(/^(\s*)([a-z])/, (_m, ws: string, c: string) => `${ws}${c.toUpperCase()}`)
    .replace(/([.!?])([ \t\n]+)([a-z])/g, (_m, p: string, ws: string, c: string) => `${p}${ws}${c.toUpperCase()}`);
}
