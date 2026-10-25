// BullMQ queue registration begins with the first asynchronous business job.
export const QUEUE_NAMES = {
  mail: 'mail',
  notifications: 'notifications',
  jobAlerts: 'job-alerts',
  billing: 'billing',
  aiOrchestration: 'ai-orchestration',
} as const;
