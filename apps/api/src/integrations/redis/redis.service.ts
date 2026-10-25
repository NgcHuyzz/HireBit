import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  async ping(): Promise<void> {
    const client = new Redis(process.env.REDIS_URL!, {
      lazyConnect: true,
      connectTimeout: 1000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    client.on('error', (error: Error) => this.logger.warn(`Redis unavailable: ${error.message}`));
    try {
      await client.ping();
    } finally {
      client.disconnect();
    }
  }
}
