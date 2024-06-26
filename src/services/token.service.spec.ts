import { it, beforeAll, describe, expect, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { AccessTokenPayloadData } from '../interfaces/token.interface';
import { FastifyInstance } from 'fastify';
import { TokenService } from './token.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { profile, member } from '@prisma/client';
import { randomBytes } from 'crypto';
import { httpErrors } from '@fastify/sensible';

describe('TokenService', () => {
  let service: TokenService;
  let fastify: DeepMockProxy<FastifyInstance>;

  // setup basic data for testing
  const user: member = {
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
  const accessPayloadData: AccessTokenPayloadData = {
    uuidKey: user.uuid_key,
    email: user.email,
    nickname: profile.nickname,
    imageUrl: profile.image_url,
  };

  /**
   * Generate token data
   */
  // Authorization code
  const secret = 'secret';
  const code = randomBytes(16).toString('hex');
  // Access token
  const accessToken = jwt.sign(accessPayloadData, secret, {
    expiresIn: '2h',
    issuer: 'ifelfi.com',
  });
  const expiredAccessToken = jwt.sign(accessPayloadData, secret, {
    expiresIn: '0ms',
    issuer: 'ifelfi.com',
  });
  const wrongSecretAccessToken = jwt.sign(accessPayloadData, 'wrong', {
    expiresIn: '1h',
    issuer: 'ifelfi.com',
  });
  const wrongPayloadAccessToken = jwt.sign({}, secret, {
    expiresIn: '2h',
    issuer: 'ifelfi.com',
  });
  // Refresh token
  const refreshToken = jwt.sign({}, secret, {
    expiresIn: '2d',
    issuer: 'ifelfi.com',
  });
  const expiredRefreshToken = jwt.sign({}, secret, {
    expiresIn: '0ms',
    issuer: 'ifelfi.com',
  });
  const wrongSecretRefreshToken = jwt.sign({}, 'wrong', {
    expiresIn: '2d',
    issuer: 'ifelfi.com',
  });
  const wrongPayloadRefreshToken = jwt.sign({ wrong: 'payload' }, secret, {
    expiresIn: '2d',
    issuer: 'ifelfi.com',
  });

  beforeAll(() => {
    fastify = mockDeep<FastifyInstance>();
    service = new TokenService(fastify);

    // mock config
    fastify.config = {
      HOST: 'localhost',
      PORT: 3000,
      ACCESS_TOKEN_EXPIRATION: 60 * 5,
      REFRESH_TOKEN_EXPIRATION: 60 * 60 * 24 * 3,
      AUTH_CODE_EXPIRATION: 60 * 3,
      AUTO_LOGIN_CODE_EXPIRATION: 60 * 60 * 24 * 7,
      DATABASE_URL: 'postgres://localhost:5432',
      REDIS_URL: 'redis://localhost:6379',
      TOKEN_SECRET: 'secret',
      COOKIE_SECRET: 'secret',
      SALT: 'salt',
      ISSUER: 'ifelfi.com',
    };

    /**
     * Mock Fastify instance methods
     */

    // mock jwt methods
    jest.spyOn(fastify.jwt, 'verify').mockImplementation((token) => {
      return jwt.verify(token, secret, {
        issuer: 'ifelfi.com',
      });
    });
    jest.spyOn(fastify.jwt, 'decode').mockImplementation((token) => {
      return jwt.decode(token);
    });
    jest.spyOn(fastify.jwt, 'sign').mockImplementation((payload, options) => {
      const token = jwt.sign(payload, secret, {
        ...options,
        issuer: 'ifelfi.com',
      });
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

  describe('issueAccessToken', () => {
    it('should return access token', () => {
      const result = service['issueAccessToken'](accessPayloadData);
      const decoded = jwt.decode(result);
      expect(result).toBeTruthy();
      expect(decoded).toBeTruthy();
      expect(decoded).toHaveProperty('uuidKey', accessPayloadData.uuidKey);
      expect(decoded).toHaveProperty('email', accessPayloadData.email);
      expect(decoded).toHaveProperty('nickname', accessPayloadData.nickname);
      expect(decoded).toHaveProperty('imageUrl', accessPayloadData.imageUrl);
      expect(decoded).toHaveProperty('exp');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('iss');
    });
  });

  describe('issueRefreshToken', () => {
    it('should return refresh token', () => {
      const result = service['issueRefreshToken']();
      const decoded = jwt.decode(result);
      expect(result).toBeTruthy();
      expect(decoded).toBeTruthy();
      expect(decoded).toHaveProperty('exp');
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('iss');
    });
  });

  describe('issueTokenPairByUserId', () => {
    it('should return token pair', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(user);
      jest
        .spyOn(fastify.prisma.profile, 'findUnique')
        .mockResolvedValue(profile);
      jest.spyOn(fastify.redis, 'set').mockResolvedValue('OK');

      const result = await service.issueTokenPairByUserId(user.id);
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should throw internal server error when user not found', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(null);
      await expect(service.issueTokenPairByUserId(user.id)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw internal server error when profile not found', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(user);
      jest.spyOn(fastify.prisma.profile, 'findUnique').mockResolvedValue(null);
      await expect(service.issueTokenPairByUserId(user.id)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('issueTokenPairByAuthCode', () => {
    it('should return token pair', async () => {
      jest.spyOn(fastify.redis, 'get').mockResolvedValue(user.id.toString());
      jest.spyOn(fastify.redis, 'del').mockResolvedValue(1);
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(user);
      jest
        .spyOn(fastify.prisma.profile, 'findUnique')
        .mockResolvedValue(profile);

      const result = await service.issueTokenPairByAuthCode(code);

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should throw internal server error when getting code throw error', async () => {
      jest.spyOn(fastify.redis, 'get').mockRejectedValue(new Error());
      await expect(service.issueTokenPairByAuthCode(code)).rejects.toThrow(
        'Get code error',
      );
    });

    it('should throw not found error when code is not found', async () => {
      jest.spyOn(fastify.redis, 'get').mockResolvedValue(null);
      await expect(service.issueTokenPairByAuthCode(code)).rejects.toThrow(
        'Code not found',
      );
    });

    it('should throw internal server error when code is invalid', async () => {
      jest.spyOn(fastify.redis, 'get').mockResolvedValue('invalid');
      await expect(service.issueTokenPairByAuthCode(code)).rejects.toThrow(
        'Code error',
      );
    });

    it('should throw internal server error when deleting code throw error', async () => {
      jest.spyOn(fastify.redis, 'get').mockResolvedValue(user.id.toString());
      jest.spyOn(fastify.redis, 'del').mockRejectedValue(new Error());
      await expect(service.issueTokenPairByAuthCode(code)).rejects.toThrow(
        'Delete code error',
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should return payload when token is valid', async () => {
      const result = await service.verifyAccessToken(accessToken);
      expect(result.valid).toBe(true);
      expect(result.payload).toBeTruthy();
    });

    it('should throw error when token with wrong secret', async () => {
      const result = await service.verifyAccessToken(wrongSecretAccessToken);
      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
    });

    it('should throw error when token is expired', async () => {
      const result = await service.verifyAccessToken(expiredAccessToken);
      expect(result.valid).toBe(false);
      expect(result.payload).toBeTruthy();
    });

    it('should throw error when token is invalid payload', async () => {
      const result = await service.verifyAccessToken(wrongPayloadAccessToken);
      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return true when token is valid', async () => {
      jest.spyOn(fastify.redis, 'get').mockResolvedValue(refreshToken);
      expect(
        await service.verifyRefreshToken(refreshToken, user.uuid_key),
      ).toBe(true);
    });

    it('should return false when token is expired', async () => {
      expect(
        await service.verifyRefreshToken(expiredRefreshToken, user.uuid_key),
      ).toBe(false);
    });

    it('should throw error when token is invalid', async () => {
      expect(
        await service.verifyRefreshToken(
          wrongSecretRefreshToken,
          user.uuid_key,
        ),
      ).toBe(false);
    });

    it('should throw error when token is invalid', async () => {
      expect(
        await service.verifyRefreshToken(
          wrongPayloadRefreshToken,
          user.uuid_key,
        ),
      ).toBe(false);
    });
  });

  describe('refresh', () => {
    it('should return new token pair when payload data is valid', async () => {
      jest.spyOn(fastify.redis, 'set').mockResolvedValue('OK');
      const result = await service.refresh(accessPayloadData);
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('should throw error when payload data is invalid', async () => {
      await expect(
        service.refresh({} as AccessTokenPayloadData),
      ).rejects.toThrow('Payload data is invalid');
    });
  });

  describe('verify', () => {
    it('should return true with payload when access and refresh token is valid', async () => {
      const result = await service.verify({
        accessToken,
        refreshToken,
      });
      expect(result.valid).toBe(true);
      expect(result.payload).toBeTruthy();
    });

    it('should return new token pair when access token is expired', async () => {
      jest.spyOn(fastify.redis, 'get').mockResolvedValue(refreshToken);
      const result = await service.verify({
        accessToken: expiredAccessToken,
        refreshToken,
      });
      expect(result.valid).toBe(false);
      expect(result.payload).toBeTruthy();
    });

    it('should throw error when access token is invalid', async () => {
      await expect(
        service.verify({
          accessToken: wrongSecretAccessToken,
          refreshToken,
        }),
      ).rejects.toThrow('Access token is invalid');
    });
  });
});
