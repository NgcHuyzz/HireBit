export type HealthStatus = { status: string; dependencies?: { database: string; redis: string } };

export async function fetchApiHealth(path: 'live' | 'ready'): Promise<HealthStatus> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/v1/health/${path}`);
  if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
  return response.json() as Promise<HealthStatus>;
}
