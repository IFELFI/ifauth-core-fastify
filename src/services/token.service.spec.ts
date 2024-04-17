import { it, beforeAll, describe, expect, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { AccessTokenPayload } from '../interfaces/token.interface';
import { FastifyInstance } from 'fastify';
import { TokenService } from './token.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('TokenService', () => {
  let service: TokenService;
  let fastify: DeepMockProxy<FastifyInstance>;
  const uuidKey = uuidv4();
  const accessPayload: AccessTokenPayload = {
    uuidKey,
    email: 'test@ifelfi.com',
    nickname: 'test',
    imageUrl: null,
  };
  const secret = 'secret';
  const accessToken = jwt.sign(accessPayload, secret, { expiresIn: '2h' });
  const refreshToken = jwt.sign({}, secret, { expiresIn: '2d' });
  const expiredAccessToken = jwt.sign(accessPayload, secret, {
    expiresIn: '0ms',
  });
  const expiredRefreshToken = jwt.sign({}, secret, { expiresIn: '0ms' });
  const invalidAccessToken = jwt.sign(accessPayload, 'wrong', {
    expiresIn: '1h',
  });
  const invalidRefreshToken = jwt.sign({}, 'wrong', { expiresIn: '2d' });
  const wrongPayloadAccessToken = jwt.sign({}, secret, { expiresIn: '2h' });

  beforeAll(() => {
    fastify = mockDeep<FastifyInstance>();
    service = new TokenService(fastify);

    jest.spyOn(fastify.jwt, 'verify').mockImplementation((token) => {
      return jwt.verify(token, secret);
    });
    jest.spyOn(fastify.jwt, 'decode').mockImplementation((token) => {
      return jwt.decode(token);
    });
    jest.spyOn(fastify.jwt, 'sign').mockImplementation((payload, options) => {
      const token = jwt.sign(payload, secret, { expiresIn: options.expiresIn });
      return token;
    });

    // mock config
    fastify.config = {
      HOST: 'localhost',
      PORT: 3000,
      ACCESS_TOKEN_EXPIRATION: 60 * 5,
      REFRESH_TOKEN_EXPIRATION: 60 * 60 * 24 * 3,
      DATABASE_URL: 'postgres://localhost:5432',
      REDIS_URL: 'redis://localhost:6379',
      TOKEN_SECRET: 'secret',
      COOKIE_SECRET: 'secret',
      SALT: 'salt',
      AUTH_CODE_EXPIRATION: 60 * 3,
    };

    jest
      .spyOn(fastify.httpErrors, 'unauthorized')
      .mockImplementation((msg?: string) => {
        throw new Error(msg);
      });

    jest.spyOn(fastify.redis, 'get').mockImplementation((key) => {
      return new Promise((resolve) => {
        if (key === uuidKey) {
          resolve(refreshToken);
        } else {
          resolve(null);
        }
      });
    });
  });

  describe('isValidOrExpired', () => {
    it('should return true when token is valid', async () => {
      const result = await service.isValidOrExpired(accessToken, true);
      expect(result.result).toBe(true);
    });

    it('should return false when token is expired', async () => {
      const result = await service.isValidOrExpired(expiredAccessToken, true);
      expect(result.result).toBe(false);
    });

    it('should return false when token is invalid', async () => {
      const result = await service.isValidOrExpired(invalidAccessToken, true);
      expect(result.result).toBe(false);
    });

    it('should return true when token is valid refresh token', async () => {
      const result = await service.isValidOrExpired(refreshToken, false);
      expect(result.result).toBe(true);
    });

    it('should return false when token is expired refresh token', async () => {
      const result = await service.isValidOrExpired(expiredRefreshToken, false);
      expect(result.result).toBe(false);
    });

    it('should return false when token is invalid refresh token', async () => {
      const result = await service.isValidOrExpired(invalidRefreshToken, false);
      expect(result.result).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return true when access token is valid', async () => {
      expect(await service.validate({ accessToken, refreshToken })).toBe(true);
    });

    it('should return true when access token is expired but refresh token is valid', async () => {
      expect(
        await service.validate({
          accessToken: expiredAccessToken,
          refreshToken,
        }),
      ).toBe(true);
    });

    it('should return false when access token is invalid', async () => {
      expect(
        await service.validate({
          accessToken: invalidAccessToken,
          refreshToken,
        }),
      ).toBe(true);
    });

    it('should return true when refresh token is invalid but access token is valid', async () => {
      expect(
        await service.validate({
          accessToken,
          refreshToken: invalidRefreshToken,
        }),
      ).toBe(true);
    });

    it('should return false when access token is invalid payload', async () => {
      expect(
        await service.validate({
          accessToken: wrongPayloadAccessToken,
          refreshToken,
        }),
      ).toBe(false);
    });

    it('should return false when access token is expired and refresh token is expired', async () => {
      expect(
        await service.validate({
          accessToken: expiredAccessToken,
          refreshToken: expiredRefreshToken,
        }),
      ).toBe(false);
    });
  });

  describe('validateAndRefresh', () => {
    it('should return new token pair when token pair is valid', async () => {
      const tokenPair = { accessToken, refreshToken };
      const newTokenPair = await service.validateAndRefresh(tokenPair);
      expect(newTokenPair.accessToken).not.toBe(accessToken);
      expect(newTokenPair.refreshToken).not.toBe(refreshToken);
    });

    it('should return new token pair when token pair is invalid but refresh token is valid', async () => {
      const tokenPair = { accessToken: invalidAccessToken, refreshToken };
      const newTokenPair = await service.validateAndRefresh(tokenPair);
      expect(newTokenPair.accessToken).not.toBe(invalidAccessToken);
      expect(newTokenPair.refreshToken).not.toBe(refreshToken);
    });

    it('should throw unauthorized error when access token is invalid payload', async () => {
      const tokenPair = { accessToken: wrongPayloadAccessToken, refreshToken };
      await expect(service.validateAndRefresh(tokenPair)).rejects.toThrow(
        'Token is invalid error',
      );
    });
  });
});
