import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateEnv } from '../src/config/env.validation';

const valid = {
  DATABASE_URL: 'postgresql://hirebit:secret@localhost:5432/hirebit',
  REDIS_URL: 'redis://localhost:6379/0',
  AI_SERVICE_URL: 'http://localhost:8000',
};

test('environment validation accepts local service URLs', () => {
  assert.equal(validateEnv(valid).PORT, 3000);
});

test('environment validation rejects invalid service URLs', () => {
  assert.throws(() => validateEnv({ ...valid, DATABASE_URL: 'sqlite://local' }), /DATABASE_URL/);
});
