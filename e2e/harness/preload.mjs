// Loaded into the app under test: routes its database and email traffic to the throwaway
// server, and refuses anything that would reach a real database.
const realFetch = globalThis.fetch;

globalThis.fetch = (input, init) => {
  const url = String(input?.url ?? input);
  if (/\/sql(\?|$)/.test(url)) return realFetch('http://127.0.0.1:5499/sql', init);
  if (url.includes('api.resend.com')) return realFetch('http://127.0.0.1:5499/emails', init);
  if (url.includes('neon.tech')) throw new Error(`Blocked a test from reaching a real database: ${url}`);
  return realFetch(input, init);
};
