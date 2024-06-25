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
    await redisClient.set(data.user.member.uuid_key, data.refreshToken.normal);
  });

  describe('[GET] /user/profile', () => {
    let expectedProfile: {
      uuidKey: string;
      email: string;
      nickname: string;
      imageUrl: string | null;
      joinDate: string;
      updateDate: string;
      provider: provider_type;
    };
    beforeEach(() => {
      expectedProfile = {
        uuidKey: data.user.member.uuid_key,
        email: data.user.member.email,
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

    it('should return 401 when get user profile with expired access token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
        headers: {
          Authorization: `Bearer ${data.accessToken.expired}`,
        },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: 'Unauthorized',
        message: 'Access token needs to be refreshed',
        statusCode: 401,
      });
    });

    it('should return 401 when get user profile with wrong payload access token', async () => {
      await redisClient.del(data.user.member.uuid_key);
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
        headers: {
          Authorization: `Bearer ${data.accessToken.wrongPayload}`,
        },
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when get user profile without access token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when get user profile with an wrong secret access token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
        headers: {
          Authorization: `Bearer ${data.accessToken.wrongSecret}`,
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
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 401 when logout with expired access', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
        headers: {
          Authorization: `Bearer ${data.accessToken.expired}`,
        },
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: 'Unauthorized',
        message: 'Access token needs to be refreshed',
        statusCode: 401,
      });
    });

    it('should return 401 when logout with expired access token and refresh token', async () => {
      await redisClient.del(data.user.member.uuid_key);
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
        headers: {
          Authorization: `Bearer ${data.accessToken.wrongSecret}`,
        },
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when logout without access token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: 'Unauthorized',
        message: 'Access token is required',
        statusCode: 401,
      });
    });

    it('should return 401 when logout with an wrong payload access token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
        headers: {
          Authorization: `Bearer ${data.accessToken.wrongPayload}`,
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
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: 'Unauthorized',
        message: 'Access token needs to be refreshed',
        statusCode: 401,
      });
    });

    it('should return 401 when delete user with wrong payload access token', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/user',
        headers: {
          Authorization: `Bearer ${data.accessToken.wrongPayload}`,
        },
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when delete user with an wrong secret access token', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/user',
        headers: {
          Authorization: `Bearer ${data.accessToken.wrongSecret}`,
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
