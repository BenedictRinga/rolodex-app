export const environment = {
  production: true,
  rolodexApiBase: 'https://zyppar.com/api/openloop', // the fresh rolodex sync backend (same droplet)
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 60, // 2026-08-23 About scroll lock: overscroll-behavior contain on ion-content scroll part (no shaky rubber-band drag at top/bottom)
};
