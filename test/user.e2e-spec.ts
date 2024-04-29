import {
  it,
  afterAll,
  beforeAll,
  describe,
  expect,
  beforeEach,
} from '@jest/globals';
import { FastifyInstance } from 'fastify';
import build from '../src/app';
import {
  postgresContainer,
  redisClient,
  redisContainer,
  setupData,
  signer,
} from './setup-e2e';
import { provider_type } from '@prisma/client';

describe('User', () => {
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

  beforeEach(async () => {
    data = await setupData();
    await redisClient.set(
      data.user.user.uuid_key,
      data.refreshToken.normal,
    );
  });

  describe('[GET] /user/profile', () => {
    let expectedProfile: {
      email: string;
      nickname: string;
      imageUrl: string | null;
      joinDate: string;
      updateDate: string;
      provider: provider_type;
    };
    beforeEach(() => {
      expectedProfile = {
        email: data.user.user.email,
        nickname: data.user.profile.nickname,
        imageUrl: data.user.profile.image_url,
        joinDate: data.user.profile.join_date.toISOString(),
        updateDate: data.user.profile.update_date.toISOString(),
        provider: data.user.provider.provider,
      };
    });

    it('should return 200 when get user profile', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
        headers: {
          Authorization: `Bearer ${data.accessToken.normal}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.normal),
        },
      });
      expect(response.json()).toEqual({
        message: 'User profile found',
        data: expectedProfile,
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 200 when get user profile with expired access token but refresh token is valid', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
        headers: {
          Authorization: `Bearer ${data.accessToken.expired}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.normal),
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        message: 'User profile found',
        data: expectedProfile,
      });
    });

    it('should return 401 when get user profile with expired access token and refresh token', async () => {
      await redisClient.del(data.user.user.uuid_key);
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
        headers: {
          Authorization: `Bearer ${data.accessToken.expired}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.expired),
        },
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when get user profile without access and refresh token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when get user profile with an wrong payload access token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
        headers: {
          Authorization: `Bearer ${data.accessToken.wrongPayload}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.normal),
        },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('[GET] /user/logout', () => {
    it('should return 200 when logout', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
        headers: {
          Authorization: `Bearer ${data.accessToken.normal}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.normal),
        },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 200 when logout with expired access token but refresh token is valid', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
        headers: {
          Authorization: `Bearer ${data.accessToken.expired}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.normal),
        },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 401 when logout with expired access token and refresh token', async () => {
      await redisClient.del(data.user.user.uuid_key);
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
        headers: {
          Authorization: `Bearer ${data.accessToken.expired}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.normal),
        },
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when logout without access and refresh token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when logout with an wrong payload access token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
        headers: {
          Authorization: `Bearer ${data.accessToken.wrongPayload}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.normal),
        },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('[DELETE] /user', () => {
    it('should return 200 when delete user', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/user',
        headers: {
          Authorization: `Bearer ${data.accessToken.normal}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.normal),
        },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 200 when delete user with expired access token but refresh token is valid', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/user',
        headers: {
          Authorization: `Bearer ${data.accessToken.expired}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.normal),
        },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 401 when delete user with expired access token and refresh token', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/user',
        headers: {
          Authorization: `Bearer ${data.accessToken.expired}`,
        },
        cookies: {
          refresh: signer.sign(data.refreshToken.expired),
        },
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when delete user without access and refresh token', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/user',
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
