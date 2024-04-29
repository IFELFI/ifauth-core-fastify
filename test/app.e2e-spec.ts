import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import build from '../src/app';
import { FastifyInstance } from 'fastify';
import {
  postgresContainer,
  redisContainer,
} from './setup-e2e';

describe('App', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await build(
      {},
      {
        ...process.env,
        DATABASE_URL: postgresContainer.getConnectionUri(),
        REDIS_URL: redisContainer.getConnectionUrl(),
      },
    );
  });

  afterAll(async () => {
    await server.close();
  });

  it('should be defined', () => {
    expect(server).toBeDefined();
  });

  it('should have a config object', () => {
    expect(server.config).toBeDefined();
  });

  it('health check should return ok', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
