export function getAppConfig() {
  return {
    port: Number(process.env.PORT ?? 3000),
    webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  };
}
