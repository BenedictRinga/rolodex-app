/**
 * 2026-09-01 BUILD 175 (founder: "the parser from way back" — vCard import,
 * the honest batch path for every device, and THE batch path on iPhone where
 * Apple's wall blocks the Contact Picker API).
 *
 * A small, dependency-free vCard (.vcf) reader. It handles what phones and
 * Google Contacts actually export: folded lines, vCard 2.1/3.0/4.0 property
 * shapes, QUOTED-PRINTABLE names (the iPhone classic), escaped commas and
 * semicolons, N-ordered names, cell-first phone preference, ORG companies,
 * CATEGORIES tags, and base64 photos (size-capped so a deck of portraits
 * cannot bloat storage).
 */

export interface VcfContact {
  display: string;
  given: string;
  family: string;
  prefix: string;
  suffix: string;
  phones: string[];
  emails: string[];
  company: string;
  note: string;
  tags: string[];
  photo: string | null;
}

/** Guard against portrait bloat: ~300 KB of base64 per card, maximum. */
const MAX_PHOTO_B64 = 300_000;

/** Undo vCard line-folding: a continuation line opens with a space or tab. */
function unfold(text: string): string[] {
  const out: string[] = [];
  for (const rawLine of text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    if ((rawLine.startsWith(' ') || rawLine.startsWith('\t')) && out.length) {
      out[out.length - 1] += rawLine.slice(1);
    } else {
      out.push(rawLine);
    }
  }
  return out.filter((l) => l.trim().length > 0);
}

/** Decode QUOTED-PRINTABLE (=XX bytes, =\n soft breaks) as UTF-8. */
function decodeQuotedPrintable(value: string): string {
  const bytes: number[] = [];
  let i = 0;
  const softBreaksGone = value.replace(/=\n/g, '');
  while (i < softBreaksGone.length) {
    const ch = softBreaksGone[i];
    if (ch === '=' && /^[0-9A-Fa-f]{2}$/.test(softBreaksGone.slice(i + 1, i + 3))) {
      bytes.push(parseInt(softBreaksGone.slice(i + 1, i + 3), 16));
      i += 3;
    } else {
      bytes.push(ch.charCodeAt(0) & 0xff);
      i += 1;
    }
  }
  try {
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return softBreaksGone;
  }
}

/** Unescape vCard text values: \n newline, \, \; \\ literals. */
function unescapeValue(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

/** Split a property line into { name, params, value }. */
function parseProp(line: string): { name: string; params: Set<string>; paramsLower: Set<string>; value: string } | null {
  const colon = findValueColon(line);
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = head.split(';');
  // Apple exports grouped properties ("item1.TEL", "item2.X-ABLabel") —
  // strip the group prefix so the property name is the part that matters.
  const name = (parts.shift() || '').trim().toUpperCase().replace(/^[A-Z0-9]+\./, '');
  if (!name) return null;
  const params = new Set<string>();
  const paramsLower = new Set<string>();
  for (const p of parts) {
    const key = p.split('=')[0].trim().toUpperCase();
    if (!key) continue;
    params.add(key);
    paramsLower.add(key + ':' + p.split('=').slice(1).join('=').trim().toUpperCase());
  }
  return { name, params, paramsLower, value };
}

/** The value starts after the first colon NOT inside a quoted parameter. */
function findValueColon(line: string): number {
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuote = !inQuote;
    else if (c === ':' && !inQuote) return i;
  }
  return -1;
}

function decodeIfQp(prop: { paramsLower: Set<string>; value: string }): string {
  for (const p of prop.paramsLower) {
    if (p.startsWith('ENCODING:QUOTED-PRINTABLE') || p === 'ENCODING:QP') return decodeQuotedPrintable(prop.value);
  }
  return prop.value;
}

function telScore(paramsLower: Set<string>): number {
  const s = [...paramsLower].join(' ');
  if (/CELL/.test(s) || /IPHONE/.test(s) || /MOBILE/.test(s)) return 0;
  if (/VOICE/.test(s)) return 1;
  return 2;
}

function photoDataUri(prop: { paramsLower: Set<string>; value: string }): string | null {
  const v = prop.value.trim();
  if (!v || v.length > MAX_PHOTO_B64) return null;
  if (/^data:image\//i.test(v)) return v;
  let mime = 'image/jpeg';
  for (const p of prop.paramsLower) {
    const m = p.match(/^TYPE:?(JPEG|PNG|GIF)$/);
    if (m) mime = 'image/' + m[1].toLowerCase();
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(v)) return null;
  return `data:${mime};base64,${v.replace(/\s+/g, '')}`;
}

/** The card being assembled — typed so dot access passes the strict compiler. */
interface DraftCard {
  display?: string;
  given?: string;
  family?: string;
  prefix?: string;
  suffix?: string;
  _tels?: Array<{ v: string; score: number }>;
  _emails?: Array<{ v: string; pref: number }>;
  company?: string;
  note?: string;
  tags?: string[];
  photo?: string | null;
}

/** Parse a whole .vcf payload into plain contact records. */
export function parseVcf(text: string): VcfContact[] {
  const lines = unfold(text || '');
  const cards: VcfContact[] = [];
  let cur: DraftCard | null = null;

  const flush = (): void => {
    if (!cur) return;
    const display = String(cur.display || '').trim();
    const joined = [cur.prefix, cur.given, cur.family].filter(Boolean).join(' ').trim();
    // cell-first phones, preferred-first emails (sorted pairs, then strings)
    const telPairs: Array<{ v: string; score: number }> = (cur._tels || []);
    telPairs.sort((a, b) => a.score - b.score);
    const phones = telPairs.map((t) => t.v).filter(Boolean);
    const mailPairs: Array<{ v: string; pref: number }> = (cur._emails || []);
    mailPairs.sort((a, b) => a.pref - b.pref);
    const emails = mailPairs.map((m) => m.v).filter(Boolean);
    const name = display || joined || phones[0] || emails[0] || '';
    if (name && (phones.length || emails.length || cur.photo || display)) {
      cards.push({
        display: name,
        given: String(cur.given || '').trim(),
        family: String(cur.family || '').trim(),
        prefix: String(cur.prefix || '').trim(),
        suffix: String(cur.suffix || '').trim(),
        phones,
        emails,
        company: String(cur.company || '').trim(),
        note: String(cur.note || '').trim(),
        tags: (cur.tags || []).filter(Boolean).slice(0, 6),
        photo: cur.photo || null,
      });
    }
    cur = null;
  };

  for (const line of lines) {
    const upper = line.trim().toUpperCase();
    if (upper === 'BEGIN:VCARD') { cur = {}; continue; }
    if (upper === 'END:VCARD') { flush(); continue; }
    if (!cur) continue;
    const prop = parseProp(line);
    if (!prop) continue;
    const { name, params, paramsLower, value } = prop;

    if (name === 'FN') {
      const v = unescapeValue(decodeIfQp(prop)).trim();
      if (v && !cur.display) cur.display = v;
    } else if (name === 'N') {
      // vCard N order: Family;Given;Middle;Prefix;Suffix
      const seg = value.split(/(?<!\\);/).map((s) => unescapeValue(decodeIfQp({ paramsLower, value: s })).trim());
      if (!cur.family) cur.family = seg[0] || '';
      if (!cur.given) cur.given = seg[1] || '';
      if (!cur.prefix) cur.prefix = seg[3] || '';
      if (!cur.suffix) cur.suffix = seg[4] || '';
    } else if (name === 'NICKNAME') {
      if (!cur.display) cur.display = unescapeValue(value).trim();
    } else if (name === 'TEL') {
      const v = unescapeValue(value).trim();
      if (v) {
        (cur._tels = cur._tels || []).push({ v, score: telScore(paramsLower) });
      }
    } else if (name === 'EMAIL') {
      const v = unescapeValue(value).trim();
      if (v) {
        const pref = [...paramsLower].some((p) => p.startsWith('TYPE:PREF')) ? 0 : 1;
        (cur._emails = cur._emails || []).push({ v, pref });
      }
    } else if (name === 'ORG') {
      const first = value.split(/(?<!\\);/)[0] || '';
      if (!cur.company) cur.company = unescapeValue(first).trim();
    } else if (name === 'NOTE') {
      if (!cur.note) cur.note = unescapeValue(decodeIfQp(prop)).trim();
    } else if (name === 'CATEGORIES') {
      const tags = value.split(/(?<!\\),/).map((s) => unescapeValue(s).trim()).filter(Boolean);
      cur.tags = [...(cur.tags || []), ...tags];
    } else if (name === 'PHOTO') {
      if (!cur.photo) cur.photo = photoDataUri(prop);
    }
  }
  flush();
  return cards;
}
