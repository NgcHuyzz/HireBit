import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../integrations/redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly database: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Process liveness' })
  live() { return { status: 'ok' }; }

  @Get('ready')
  @ApiOperation({ summary: 'PostgreSQL and Redis readiness' })
  async ready() {
    const [database, redis] = await Promise.allSettled([this.database.ping(), this.redis.ping()]);
    if (database.status === 'rejected' || redis.status === 'rejected') {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        dependencies: {
          database: database.status === 'fulfilled' ? 'ok' : 'unavailable',
          redis: redis.status === 'fulfilled' ? 'ok' : 'unavailable',
        },
      });
    }
    return { status: 'ok', dependencies: { database: 'ok', redis: 'ok' } };
  }
}
