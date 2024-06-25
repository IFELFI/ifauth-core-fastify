import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { FastifyInstance } from 'fastify';
import build from '../../src/app';
import {
  postgresContainer,
  redisClient,
  redisContainer,
  setupData,
  signer,
} from '../setup-e2e';
import { randomBytes } from 'crypto';

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
        cookies: {
          AUTO: signer.sign('code'),
          SSID: signer.sign(data.user.ssid.SSID),
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('[GET] /auth/auto/issue', () => {
    const code = randomBytes(16).toString('hex');

    beforeEach(async () => {
      data = await setupData();
      await redisClient.set(code, data.user.member.id);
    });

    it('should return 200 and a new auto login code', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/auto/issue',
        query: {
          code: code,
        },
        cookies: {
          SSID: signer.sign(data.user.ssid.SSID),
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeDefined();
    });
  });
});
