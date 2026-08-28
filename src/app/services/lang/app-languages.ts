/**
 * 2026-08-28 BUILD 124 — THE ONE LANGUAGE LIST for every dropdown in the app.
 *
 * Why this exists: the Inbox header and Settings each carried their OWN copy of
 * the list, and the Inbox copy had drifted back to 11 entries — Russian,
 * Hebrew, Spanish and Portuguese-Brazil were simply absent, so the popover
 * "started at English and ended abruptly at German" (founder report). One list,
 * imported everywhere, can never drift again.
 *
 * The 15 codes are exactly the hand-maintained set (7 hand-translated majors +
 * the shipping majors from build 120). Order is display order: English first.
 */
export interface AppLanguage {
  code: string;
  label: string;
}

export const APP_LANGUAGES: AppLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Swahili' },
  { code: 'am', label: 'Amharic' },
  { code: 'so', label: 'Somali' },
  { code: 'ar', label: 'Arabic' },
  // 2026-08-28 BUILD 120: hand-verified majors that shipped unlisted —
  // Hebrew, Spanish, Russian, Portuguese-Brazil join the dropdown.
  { code: 'he', label: 'Hebrew' },
  { code: 'ha', label: 'Hausa' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'zh-cmn-Hans', label: 'Chinese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ru', label: 'Russian' },
  { code: 'pt-PT', label: 'Portuguese' },
  { code: 'pt-br', label: 'Portuguese (Brazil)' },
  { code: 'de', label: 'German' },
];

/**
 * 2026-08-28 BUILD 124: every language popover MUST bind this as its
 * [interfaceOptions] so global.scss can cap its height and scroll the list
 * internally (build 121 wired it only into Settings; the Inbox popover never
 * received the class and clipped its tail instead of scrolling).
 */
export const LANG_POPOVER_OPTS = { cssClass: 'settings-lang-popover' };
