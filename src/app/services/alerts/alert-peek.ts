/**
 * 2026-08-28 BUILD 125 — VIEW ON/OFF FOR PASSWORD ALERT INPUTS (founder rule:
 * "everywhere we code passwords/passkeys we should have a view on/off").
 *
 * Ionic alerts render their inputs inside the ion-alert shadow root, so a
 * plain DOM toggle can't be bound the usual way. This helper waits for the
 * shadow DOM to paint, then drops a small 👁 toggle beside every password
 * input and flips their type together. Contained, DI-free, reusable by any
 * component that presents an AlertController alert with password inputs
 * (sync passphrase set/change, enter-passphrase prompt, lock PIN, investor
 * gates). The tester dashboard ships its own native toggle (build 124).
 */

/** Injected once per alert shadow root. */
const PEEK_STYLE = `
  .lk-peek {
    align-self: flex-end;
    margin: -30px 6px 4px auto;
    background: transparent;
    border: 0;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    opacity: .55;
    z-index: 2;
    position: relative;
  }
  .lk-peek:hover { opacity: 1; }
`;

export function attachPasswordPeek(alert: HTMLIonAlertElement): void {
  const wire = (attempts = 0): void => {
    if (!document.body.contains(alert)) return; // closed before paint
    const host = document.querySelector('ion-alert');
    const root: ShadowRoot | null | undefined = (host as any)?.shadowRoot;
    if (!root) {
      // Keep trying briefly — the overlay may still be entering the DOM.
      if (attempts < 40) requestAnimationFrame(() => wire(attempts + 1));
      return;
    }
    const inputs = Array.from(root.querySelectorAll<HTMLInputElement>('input'))
      .filter((el) => el.type === 'password');
    if (!inputs.length) {
      if (attempts < 40) requestAnimationFrame(() => wire(attempts + 1));
      return;
    }
    // One style block + one toggle per password field, idempotent per alert.
    if (!root.querySelector('style[data-lk-peek]')) {
      const s = document.createElement('style');
      s.setAttribute('data-lk-peek', '');
      s.textContent = PEEK_STYLE;
      root.appendChild(s);
    }
    for (const input of inputs) {
      if (input.dataset['lkPeek'] === '1') continue; // already wired
      input.dataset['lkPeek'] = '1';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'lk-peek';
      toggle.setAttribute('aria-label', 'Show / hide');
      toggle.textContent = '👁';
      toggle.addEventListener('click', () => {
        const hide = input.type === 'text';
        // Flip every password field in this alert together (set + confirm).
        Array.from(root.querySelectorAll<HTMLInputElement>('input[data-lk-peek="1"]'))
          .forEach((el) => { el.type = hide ? 'password' : 'text'; });
        toggle.style.opacity = hide ? '.55' : '1';
      });
      (input.parentElement ?? input).appendChild(toggle);
    }
  };
  requestAnimationFrame(() => wire());
}