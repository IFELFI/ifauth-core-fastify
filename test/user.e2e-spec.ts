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
  accessToken,
  createDefaultLocalUser,
  postgresContainer,
  redisClient,
  redisContainer,
  refreshToken,
  signer,
} from './setup-e2e';

describe('User', () => {
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

  describe('[GET] /user/profile', () => {
    const expectedProfile = {
         email: 'test@ifelfi.com',
          nickname: 'test',
          imageUrl: null,
          joinDate: expect.any(String),
          updateDate: expect.any(String),
          provider: 'local',
    };
  
    it('should return 200 when get user profile', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
        headers: {
          Authorization: `Bearer ${createdUser.accessToken}`,
        },
        cookies: {
          refresh: signer.sign(refreshToken),
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        message: 'User profile found',
        data: expectedProfile,
      });
    });

    it('should return 200 when get user profile with expired access token but refresh token is valid', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
        headers: {
          Authorization: `Bearer ${createdUser.expiredAccessToken}`,
        },
        cookies: {
          refresh: signer.sign(refreshToken),
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        message: 'User profile found',
        data: expectedProfile,
      });
    });

    it('should return 401 when get user profile with expired access token and refresh token', async () => {
      await redisClient.del(createdUser.uuidKey);
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
        headers: {
          Authorization: `Bearer ${createdUser.expiredAccessToken}`,
        },
        cookies: {
          refresh: signer.sign(refreshToken),
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

    it('should return 404 when get user profile with an invalid access token', async () => {
      await redisClient.del(createdUser.uuidKey);
      const response = await server.inject({
        method: 'GET',
        url: '/user/profile',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cookies: {
          refresh: signer.sign(refreshToken),
        },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('[GET] /user/logout', () => {
    it('should return 200 when logout', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
        headers: {
          Authorization: `Bearer ${createdUser.accessToken}`,
        },
        cookies: {
          refresh: signer.sign(refreshToken),
        },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 200 when logout with expired access token but refresh token is valid', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
        headers: {
          Authorization: `Bearer ${createdUser.expiredAccessToken}`,
        },
        cookies: {
          refresh: signer.sign(refreshToken),
        },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 401 when logout with expired access token and refresh token', async () => {
      await redisClient.del(createdUser.uuidKey);
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
        headers: {
          Authorization: `Bearer ${createdUser.expiredAccessToken}`,
        },
        cookies: {
          refresh: signer.sign(refreshToken),
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

    it('should return 404 when logout with an invalid access token', async () => {
      await redisClient.del(createdUser.uuidKey);
      const response = await server.inject({
        method: 'GET',
        url: '/user/logout',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cookies: {
          refresh: signer.sign(refreshToken),
        },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('[DELETE] /user', () => {
    it('should return 200 when delete user', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/user',
        headers: {
          Authorization: `Bearer ${createdUser.accessToken}`,
        },
        cookies: {
          refresh: signer.sign(refreshToken),
        },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 200 when delete user with expired access token but refresh token is valid', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/user',
        headers: {
          Authorization: `Bearer ${createdUser.expiredAccessToken}`,
        },
        cookies: {
          refresh: signer.sign(refreshToken),
        },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return 401 when delete user with expired access token and refresh token', async () => {
      await redisClient.del(createdUser.uuidKey);
      const response = await server.inject({
        method: 'DELETE',
        url: '/user',
        headers: {
          Authorization: `Bearer ${createdUser.expiredAccessToken}`,
        },
        cookies: {
          refresh: signer.sign(refreshToken),
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
