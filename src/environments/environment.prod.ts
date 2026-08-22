export const environment = {
  production: true,
  rolodexApiBase: 'https://zyppar.com/api/openloop', // the fresh rolodex sync backend (same droplet)
  version: '0.3.1', // OpenLoop app version — compared against /api/updates/check
  build: 48, // 2026-08-22 Proper AI chat window (rich thread, instant engagement on input focus, new greeting); FAQ Go buttons via direct onNavigate callback (fixes demos closing with no action)
};
