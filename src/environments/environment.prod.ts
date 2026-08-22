export const environment = {
  production: true,
  rolodexApiBase: 'https://zyppar.com/api/openloop', // the fresh rolodex sync backend (same droplet)
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 56, // 2026-08-22 LoopKeeper WebRTC: branded modal, polite-peer join handshake (no offer glare), full ICE candidate relay, device-permission messages
};
