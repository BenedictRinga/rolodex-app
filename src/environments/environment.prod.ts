export const environment = {
  production: true,
  // 2026-08-26 CANONICAL API PATH: /api/loopkeeper (rolodex-server keeps
  // /api/openloop + /api/rolodex as backward-compatible aliases).
  rolodexApiBase: 'https://zyppar.com/api/loopkeeper',
  version: '0.3.1', // LoopKeeper app version — compared against /api/updates/check
  build: 120, // 2026-08-28 GLM ENGINE + LANGUAGE DROPDOWN: third AI engine via OpenRouter (ai-settings gains GLM; chat ladder DeepSeek > Grok > GLM); Russian, Hebrew, Spanish, Portuguese-Brazil join the language dropdown; ai.engineGlm key x 39 locales
};
