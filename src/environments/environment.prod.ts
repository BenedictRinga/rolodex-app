export const environment = {
  production: true,
  rolodexApiBase: 'https://zyppar.com/api/rolodex', // the fresh rolodex sync backend (same droplet)
  version: '0.3.1', // RolodexAI app version — compared against /api/updates/check
  build: 40, // 2026-08-21 Persist last card view in IndexedDB (StorageService), restore on launch
};
