import { it, describe, beforeEach, expect, jest, beforeAll } from '@jest/globals';
import { UserService } from './user.service';
import { FastifyInstance } from 'fastify';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { v4 as uuidv4 } from 'uuid';
import { users, profile } from '@prisma/client';

describe('UserService', () => {
  let service: UserService;
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

  beforeAll(() => {
    fastify = mockDeep<FastifyInstance>();
    service = new UserService(fastify);

    // mock fastify error methods
    jest
      .spyOn(fastify.httpErrors, 'internalServerError')
      .mockImplementation((msg?: string) => {
        throw new Error(msg || 'Internal server error');
      });
    jest
      .spyOn(fastify.httpErrors, 'notFound')
      .mockImplementation((msg?: string) => {
        throw new Error(msg || 'Not found');
      });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      jest.spyOn(fastify.prisma.users, 'findUnique').mockResolvedValue(user);
      jest.spyOn(fastify.redis, 'del').mockResolvedValue(1);
      expect(await service.logout(user.uuid_key)).toBe(true);
    });

    it('should throw not found error', async () => {
      jest.spyOn(fastify.prisma.users, 'findUnique').mockResolvedValue(null);
      await expect(service.logout(user.uuid_key)).rejects.toThrow('User not found');
    });

    it('should throw internal server error', async () => {
      jest
        .spyOn(fastify.prisma.users, 'findUnique')
        .mockRejectedValue(new Error());
      await expect(service.logout(user.uuid_key)).rejects.toThrow(
        'Failed to find user',
      );
    });

    it('should throw internal server error when delete refresh token from server', async () => {
      jest.spyOn(fastify.prisma.users, 'findUnique').mockResolvedValue(user);
      jest.spyOn(fastify.redis, 'del').mockRejectedValue(new Error());
      await expect(service.logout(user.uuid_key)).rejects.toThrow(
        'Failed to delete refresh token from server',
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      jest.spyOn(fastify.prisma.users, 'delete').mockResolvedValue(user);
      jest.spyOn(fastify.redis, 'del').mockResolvedValue(1);
      expect(await service.deleteUser(user.uuid_key)).toBe(true);
    });

    it('should throw internal server error', async () => {
      jest.spyOn(fastify.prisma.users, 'delete').mockRejectedValue(new Error());
      await expect(service.deleteUser(user.uuid_key)).rejects.toThrow(
        'Failed to delete user',
      );
    });

    it('should throw internal server error when delete refresh token from server', async () => {
      jest.spyOn(fastify.prisma.users, 'delete').mockResolvedValue(user);
      jest.spyOn(fastify.redis, 'del').mockRejectedValue(new Error());
      await expect(service.deleteUser(user.uuid_key)).rejects.toThrow(
        'Failed to delete refresh token from server',
      );
    });
  });
});
