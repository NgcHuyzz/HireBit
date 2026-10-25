export function validateEnv(input: Record<string, unknown>): Record<string, unknown> {
  const env = { ...input };
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  env.PORT = port;
  for (const [key, protocol] of [
    ['DATABASE_URL', /^postgres(ql)?:$/],
    ['REDIS_URL', /^redis(s)?:$/],
    ['AI_SERVICE_URL', /^https?:$/],
  ] as const) {
    const value = env[key];
    if (typeof value !== 'string' || !value) throw new Error(`${key} is required`);
    try {
      if (!protocol.test(new URL(value).protocol)) throw new Error();
    } catch {
      throw new Error(`${key} must be a valid URL`);
    }
  }
  if (env.WEB_ORIGIN !== undefined) {
    try { new URL(String(env.WEB_ORIGIN)); } catch { throw new Error('WEB_ORIGIN must be a valid URL'); }
  }
  return env;
}
