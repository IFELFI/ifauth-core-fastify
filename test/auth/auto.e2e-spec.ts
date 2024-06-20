import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import build from '../../src/app';
import {
  postgresContainer,
  redisClient,
  redisContainer,
  setupData,
  signer,
} from '../setup-e2e';

describe('Auth auto', () => {
  let server: FastifyInstance;
  let data: Awaited<ReturnType<typeof setupData>>;

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

  describe('[GET] /auth/auto/verify', () => {
    beforeEach(async () => {
      data = await setupData();
    });

    it('should return 200 and a new auto login code', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/auto/verify',
        headers: {
          'x-forwarded-for': 'address',
        },
        cookies: {
          autoLogin: signer.sign('code'),
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeDefined();
    });
  });
});
