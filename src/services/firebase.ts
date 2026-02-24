// These are initialized in index.html, we just use the global instances
// to follow the "Piscina Limpa" architecture and avoid double-loading warnings.

export const auth = (window as any).auth;
export const db = (window as any).db;
export const storage = (window as any).storage;
