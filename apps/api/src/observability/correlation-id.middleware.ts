import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

type RequestWithHeaders = { headers: Record<string, string | string[] | undefined> };
type ResponseWithHeaders = { setHeader(name: string, value: string): void };

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: RequestWithHeaders, response: ResponseWithHeaders, next: () => void): void {
    const value = request.headers['x-request-id'];
    const requestId = typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)
      ? value
      : randomUUID();
    response.setHeader('x-request-id', requestId);
    next();
  }
}
