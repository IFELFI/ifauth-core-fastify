import { it, beforeAll, afterAll, expect, describe, beforeEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import build from '../src/app';
import {
  postgresContainer,
  redisContainer,
  redisClient,
  signer,
  setupData,
} from './setup-e2e';
import { randomBytes } from 'crypto';

describe('Token', () => {
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

  describe('[GET] /token/issue', () => {
    const code = randomBytes(16).toString('hex');
    
    beforeEach(async () => {
      data = await setupData();
      await redisClient.set(code, data.user.user.id);
    });

    it('should issue token pair with authorization code', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/token/issue',
        query: {
          code: code,
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['authorization']).toBeDefined();
      expect(response.cookies).toBeDefined();
    });

    it('should not issue token pair with invalid authorization code', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/token/issue',
        query: {
          code: 'invalid_code',
        },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('[GET] /token/valid', () => {
    it('should validate token if access token is valid', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/token/valid',
        headers: {
          Authorization: `Bearer ${data.accessToken.normal}`,
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe('Token is valid');
    });

    it('should not validate token if access token is expired', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/token/valid',
        headers: {
          Authorization: `Bearer ${data.accessToken.expired}`,
        },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Token is expired');
    });

    it('should not validate token if access token is invalid', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/token/valid',
        headers: {
          Authorization: 'Bearer invalid_token',
        },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Access token is invalid');
    });
  });

  describe('[GET] /token/refresh', () => {
    it('should validate and refresh token if access token is valid', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/token/refresh',
        headers: {
          Authorization: `Bearer ${data.accessToken.normal}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.normal),
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['authorization']).toBeDefined();
      expect(response.cookies).toBeDefined();
    });

    it('should validate and refresh token if access token is expired but refresh token is valid', async () => {
      await redisClient.set(data.user.user.uuid_key, data.refreshToken.normal);
      const response = await server.inject({
        method: 'GET',
        url: '/token/refresh',
        headers: {
          Authorization: `Bearer ${data.accessToken.expired}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.normal),
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['authorization']).toBeDefined();
      expect(response.cookies).toBeDefined();
    });

    it('should not validate and refresh token if access token is expired and refresh token is expired', async () => {
      await redisClient.set(
        data.user.user.uuid_key,
        data.refreshToken.expired,
      );
      const response = await server.inject({
        method: 'GET',
        url: '/token/refresh',
        headers: {
          Authorization: `Bearer ${data.accessToken.expired}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.expired),
        },
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
