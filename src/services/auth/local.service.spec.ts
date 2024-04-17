import bcrypt from 'bcrypt';
import { it, describe, beforeAll, jest, expect } from '@jest/globals';
import { localSignupSchema } from '../../schema/auth.schema';
import { Static } from '@sinclair/typebox';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { FastifyInstance } from 'fastify';
import { AuthLocalService } from './local.service';
import {
  password,
  profile,
  provider,
  provider_type,
  users,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

describe('AuthLocalService', () => {
  const email = 'test@ifelfi.com';
  const nickname = 'test';
  const password = 'password';
  const secret = 'secret';
  let service: AuthLocalService;
  let fastify: DeepMockProxy<FastifyInstance>;
  beforeAll(() => {
    fastify = mockDeep<FastifyInstance>();
    service = new AuthLocalService(fastify);

    jest
      .spyOn(fastify.httpErrors, 'conflict')
      .mockImplementation((msg?: string) => {
        throw new Error(msg || 'Conflict');
      });
    jest
      .spyOn(fastify.httpErrors, 'internalServerError')
      .mockImplementation((msg?: string) => {
        throw new Error(msg || 'Internal server error');
      });
    jest
      .spyOn(fastify.httpErrors, 'unauthorized')
      .mockImplementation((msg?: string) => {
        throw new Error(msg || 'Unauthorized');
      });
    jest
      .spyOn(fastify.httpErrors, 'badRequest')
      .mockImplementation((msg?: string) => {
        throw new Error(msg || 'Bad request');
      });
    jest
      .spyOn(fastify.jwt, 'sign')
      .mockImplementation((payload, options) =>
        jwt.sign(payload, secret, { expiresIn: options.expiresIn }),
      );
    jest.spyOn(fastify.redis, 'set').mockResolvedValue('OK');

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
  });

  describe('signup', () => {
    const createdUser: users = {
      id: 1,
      email: email,
      uuid_key: uuidv4(),
    };
    const createdProfile: profile = {
      id: 1,
      user_id: createdUser.id,
      nickname: nickname,
      image_url: null,
      join_date: new Date(),
      update_date: new Date(),
    };
    const createdPass: password = {
      id: 1,
      user_id: createdUser.id,
      password: password,
      update_date: new Date(),
    };
    const createdProvider: provider = {
      id: 1,
      user_id: createdUser.id,
      provider: provider_type.local,
    };

    beforeAll(() => {
      jest
        .spyOn(fastify.prisma, '$transaction')
        .mockImplementation((callback) => callback(fastify.prisma));
    });

    it('should return token pair with access and refresh tokens', async () => {
      const signupData: Static<typeof localSignupSchema.body> = {
        email: email,
        nickname: nickname,
        password: password,
      };

      jest.spyOn(fastify.prisma.users, 'findUnique').mockResolvedValue(null);
      jest.spyOn(fastify.prisma.users, 'create').mockResolvedValue(createdUser);
      jest
        .spyOn(fastify.prisma.profile, 'create')
        .mockResolvedValue(createdProfile);
      jest
        .spyOn(fastify.prisma.password, 'create')
        .mockResolvedValue(createdPass);
      jest
        .spyOn(fastify.prisma.provider, 'create')
        .mockResolvedValue(createdProvider);

      const result = await service.signup(signupData);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw conflict error when email already exists', async () => {
      const signupData: Static<typeof localSignupSchema.body> = {
        email: email,
        nickname: nickname,
        password: password,
      };

      jest
        .spyOn(fastify.prisma.users, 'findUnique')
        .mockResolvedValue(createdUser);

      await expect(service.signup(signupData)).rejects.toThrow(
        'Email already exists',
      );
    });

    it('should throw internal server error when error creating user', async () => {
      const signupData: Static<typeof localSignupSchema.body> = {
        email: email,
        nickname: nickname,
        password: password,
      };

      jest.spyOn(fastify.prisma.users, 'findUnique').mockResolvedValue(null);
      jest.spyOn(fastify.prisma.users, 'create').mockResolvedValue(createdUser);
      jest
        .spyOn(fastify.prisma.profile, 'create')
        .mockResolvedValue(createdProfile);
      jest
        .spyOn(fastify.prisma.password, 'create')
        .mockRejectedValue(new Error('Error creating password'));

      await expect(service.signup(signupData)).rejects.toThrow(
        'Error creating user',
      );
    });
  });

  describe('login', () => {
    const findUser: users = {
      id: 1,
      email: email,
      uuid_key: uuidv4(),
    };
    const findProfile: profile = {
      id: 1,
      user_id: findUser.id,
      nickname: nickname,
      image_url: null,
      join_date: new Date(),
      update_date: new Date(),
    };
    const findPass: password = {
      id: 1,
      user_id: findUser.id,
      password: bcrypt.hashSync(password, 10),
      update_date: new Date(),
    };
    const findProvider: provider = {
      id: 1,
      user_id: findUser.id,
      provider: provider_type.local,
    };

    beforeAll(() => {
      jest
        .spyOn(fastify.prisma, '$transaction')
        .mockImplementation((callback) => callback(fastify.prisma));
      jest
        .spyOn(fastify.prisma.users, 'findUnique')
        .mockResolvedValue(findUser);
      jest
        .spyOn(fastify.prisma.profile, 'findUnique')
        .mockResolvedValue(findProfile);
      jest
        .spyOn(fastify.prisma.password, 'findUnique')
        .mockResolvedValue(findPass);
      jest
        .spyOn(fastify.prisma.provider, 'findUnique')
        .mockResolvedValue(findProvider);
    });

    it('should return token pair with access and refresh tokens', async () => {
      const loginData: Static<typeof localSignupSchema.body> = {
        email: email,
        password: password,
      };

      const result = await service.login(loginData);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw unauthorized error when user not found', async () => {
      const loginData: Static<typeof localSignupSchema.body> = {
        email: email,
        password: password,
      };

      jest.spyOn(fastify.prisma.users, 'findUnique').mockResolvedValue(null);

      await expect(service.login(loginData)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw unauthorized error when password not found', async () => {
      const loginData: Static<typeof localSignupSchema.body> = {
        email: email,
        password: password,
      };

      jest
        .spyOn(fastify.prisma.users, 'findUnique')
        .mockResolvedValue(findUser);
      jest.spyOn(fastify.prisma.password, 'findUnique').mockResolvedValue(null);

      await expect(service.login(loginData)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw unauthorized error when password is incorrect', async () => {
      const loginData: Static<typeof localSignupSchema.body> = {
        email: email,
        password: password,
      };
      jest
        .spyOn(fastify.prisma.password, 'findUnique')
        .mockResolvedValue({ ...findPass, password: 'wrong_password' });

      await expect(service.login(loginData)).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('should throw unauthorized error when provider is not local', async () => {
      const loginData: Static<typeof localSignupSchema.body> = {
        email: email,
        password: password,
      };

      jest
        .spyOn(fastify.prisma.provider, 'findUnique')
        .mockResolvedValue({ ...findProvider, provider: provider_type.google });

      await expect(service.login(loginData)).rejects.toThrow(
        'This email is registered with a different provider',
      );
    });
  });
});
