import { it, beforeAll, describe, expect, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { AccessTokenPayload } from '../interfaces/token.interface';
import { FastifyInstance } from 'fastify';
import { TokenService } from './token.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { profile, users } from '@prisma/client';
import { randomBytes } from 'crypto';
import { httpErrors } from '@fastify/sensible';

describe('TokenService', () => {
  let service: TokenService;
  let fastify: DeepMockProxy<FastifyInstance>;

  // setup basic data for testing
  const user: users = {
    id: 1,
    email: 'test@ifelfi.com',
    uuid_key: uuidv4(),
  };
  const profile: profile = {
    id: 1,
    user_id: user.id,
    nickname: 'test',
    image_url: null,
    join_date: new Date(),
    update_date: new Date(),
  };

  // payload data
  const accessPayload: AccessTokenPayload = {
    uuidKey: user.uuid_key,
    email: user.email,
    nickname: profile.nickname,
    imageUrl: profile.image_url,
  };

  // token data
  const secret = 'secret';
  const code = randomBytes(16).toString('hex');
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

    /**
     * Mock Fastify instance methods
     */

    // mock jwt methods
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

    // mock fastify error methods
    jest
      .spyOn(fastify.httpErrors, 'unauthorized')
      .mockImplementation((msg?: string) => {
        throw httpErrors.unauthorized(msg);
      });
    jest
      .spyOn(fastify.httpErrors, 'internalServerError')
      .mockImplementation((msg?: string) => {
        throw httpErrors.internalServerError(msg);
      });
    jest
      .spyOn(fastify.httpErrors, 'notFound')
      .mockImplementation((msg?: string) => {
        throw httpErrors.notFound(msg);
      });
  });

  describe('issueAuthorizationCode', () => {
    it('should return authorization code', async () => {
      jest.spyOn(fastify.redis, 'set').mockResolvedValue('OK');
      const result = await service.issueAuthorizationCode(1);
      expect(result).toBeTruthy();
      expect(result).toHaveLength(32);
    });
  });

  describe('issueTokenPair', () => {
    it('should return token pair', async () => {
      jest.spyOn(fastify.redis, 'get').mockResolvedValue(user.id.toString());
      jest.spyOn(fastify.redis, 'del').mockResolvedValue(1);
      jest.spyOn(fastify.prisma.users, 'findUnique').mockResolvedValue(user);
      jest
        .spyOn(fastify.prisma.profile, 'findUnique')
        .mockResolvedValue(profile);

      const result = await service.issueTokenPair(code);

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should throw internal server error when getting code throw error', async () => {
      jest.spyOn(fastify.redis, 'get').mockRejectedValue(new Error());
      await expect(service.issueTokenPair(code)).rejects.toThrow(
        'Get code error',
      );
    });

    it('should throw not found error when code is not found', async () => {
      jest.spyOn(fastify.redis, 'get').mockResolvedValue(null);
      await expect(service.issueTokenPair(code)).rejects.toThrow(
        'Code not found',
      );
    });

    it('should throw internal server error when code is invalid', async () => {
      jest.spyOn(fastify.redis, 'get').mockResolvedValue('invalid');
      await expect(service.issueTokenPair(code)).rejects.toThrow('Code error');
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
      jest.spyOn(fastify.redis, 'get').mockResolvedValue(refreshToken);
      expect(await service.validate({ accessToken, refreshToken })).toBe(true);
    });

    it('should return true when access token is expired but refresh token is valid', async () => {
      jest.spyOn(fastify.redis, 'get').mockResolvedValue(refreshToken);
      expect(
        await service.validate({
          accessToken: expiredAccessToken,
          refreshToken,
        }),
      ).toBe(true);
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

  it('should return true when access token is invalid but refresh token is valid', async () => {
    jest.spyOn(fastify.redis, 'get').mockResolvedValue(refreshToken);
    expect(
      await service.validate({
        accessToken: invalidAccessToken,
        refreshToken,
      }),
    ).toBe(true);
  });

  it('should return true when refresh token is invalid but access token is valid', async () => {
    jest.spyOn(fastify.redis, 'get').mockResolvedValue(refreshToken);
    expect(
      await service.validate({
        accessToken,
        refreshToken: invalidRefreshToken,
      }),
    ).toBe(true);
  });

  it('should return false when access token is invalid payload', async () => {
    jest.spyOn(fastify.redis, 'get').mockResolvedValue(refreshToken);
    expect(
      await service.validate({
        accessToken: wrongPayloadAccessToken,
        refreshToken,
      }),
    ).toBe(false);
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
