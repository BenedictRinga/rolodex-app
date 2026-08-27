/**
 * 2026-08-27 CHAT LANGUAGE — the ONE definition of "the user's language" for
 * every AI call (Confidante chat, draft polish, any future backend AI).
 *
 * Why this exists: the backend now replies in the user's language, but it can
 * only know that language if WE send it. An Arabic-UI user must never get
 * English back just because the directives were written in English.
 *
 * Precedence: in-app selection (translate.currentLang — the user may override
 * their device) → device/browser language → 'en'.
 */
import { TranslateService } from '@ngx-translate/core';

export function userLang(translate?: TranslateService | null): string {
  const sel = translate?.currentLang;
  if (sel) return sel;
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en';
}
