import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { FastifyInstance } from 'fastify';
import build from '../src/app';
import {
  createDefaultLocalUser,
  postgresContainer,
  redisClient,
  redisContainer,
  refreshToken,
} from './setup-e2e';

describe('OAuth', () => {
  let server: FastifyInstance;
  let createdUser: {
    uuidKey: string;
    accessToken: string;
    expiredAccessToken: string;
  };

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

  beforeEach(async () => {
    createdUser = await createDefaultLocalUser();
    await redisClient.set(createdUser.uuidKey, refreshToken);
  });

  describe('[POST] /oauth/local', () => {
    it('should return authorization token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: `/oauth/local?redirectUrl=`,
        payload: {
          email: 'test@ifelfi.com',
          password: 'password',
        },
      });
      expect(response.body).toBe('adsf');
      expect(response.statusCode).toBe(200);
    });
  });
});
