import { it, describe, beforeEach, expect, jest, beforeAll } from '@jest/globals';
import { UserService } from './user.service';
import { FastifyInstance } from 'fastify';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { v4 as uuidv4 } from 'uuid';
import { member, profile, provider, provider_type } from '@prisma/client';

describe('UserService', () => {
  let service: UserService;
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
  const provider: provider = {
    id: 1,
    user_id: user.id,
    provider: provider_type.local,
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

  describe('getProfile', () => {
    it('should return user profile', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(user);
      jest.spyOn(fastify.prisma.profile, 'findUnique').mockResolvedValue(profile);
      jest.spyOn(fastify.prisma.provider, 'findUnique').mockResolvedValue(provider);
      expect(await service.getProfile(user.uuid_key)).toEqual({
        uuidKey: user.uuid_key,
        email: user.email,
        nickname: profile.nickname,
        imageUrl: profile.image_url,
        joinDate: profile.join_date,
        updateDate: profile.update_date,
        provider: 'local',
      });
    });
    
    it('should throw not found error', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(null);
      await expect(service.getProfile(user.uuid_key)).rejects.toThrow('User not found');
    });

    it('should throw internal server error', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockRejectedValue(new Error());
      await expect(service.getProfile(user.uuid_key)).rejects.toThrow('Failed to find user');
    });

    it('should throw not found error when profile not found', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(user);
      jest.spyOn(fastify.prisma.profile, 'findUnique').mockResolvedValue(null);
      await expect(service.getProfile(user.uuid_key)).rejects.toThrow('User profile not found');
    });

    it('should throw internal server error when find profile', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(user);
      jest.spyOn(fastify.prisma.profile, 'findUnique').mockRejectedValue(new Error());
      await expect(service.getProfile(user.uuid_key)).rejects.toThrow('Failed to find user profile');
    });

    it('should throw not found error when provider not found', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(user);
      jest.spyOn(fastify.prisma.profile, 'findUnique').mockResolvedValue(profile);
      jest.spyOn(fastify.prisma.provider, 'findUnique').mockResolvedValue(null);
      await expect(service.getProfile(user.uuid_key)).rejects.toThrow('User provider not found');
    });

    it('should throw internal server error when find provider', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(user);
      jest.spyOn(fastify.prisma.profile, 'findUnique').mockResolvedValue(profile);
      jest.spyOn(fastify.prisma.provider, 'findUnique').mockRejectedValue(new Error());
      await expect(service.getProfile(user.uuid_key)).rejects.toThrow('Failed to find user provider');
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(user);
      jest.spyOn(fastify.redis, 'del').mockResolvedValue(1);
      expect(await service.logout(user.uuid_key)).toBe(true);
    });

    it('should throw not found error', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(null);
      await expect(service.logout(user.uuid_key)).rejects.toThrow('User not found');
    });

    it('should throw internal server error', async () => {
      jest
        .spyOn(fastify.prisma.member, 'findUnique')
        .mockRejectedValue(new Error());
      await expect(service.logout(user.uuid_key)).rejects.toThrow(
        'Failed to find user',
      );
    });

    it('should throw internal server error when delete refresh token from server', async () => {
      jest.spyOn(fastify.prisma.member, 'findUnique').mockResolvedValue(user);
      jest.spyOn(fastify.redis, 'del').mockRejectedValue(new Error());
      await expect(service.logout(user.uuid_key)).rejects.toThrow(
        'Failed to delete refresh token from server',
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      jest.spyOn(fastify.prisma.member, 'delete').mockResolvedValue(user);
      jest.spyOn(fastify.redis, 'del').mockResolvedValue(1);
      expect(await service.deleteUser(user.uuid_key)).toBe(true);
    });

    it('should throw internal server error', async () => {
      jest.spyOn(fastify.prisma.member, 'delete').mockRejectedValue(new Error());
      await expect(service.deleteUser(user.uuid_key)).rejects.toThrow(
        'Failed to delete user',
      );
    });

    it('should throw internal server error when delete refresh token from server', async () => {
      jest.spyOn(fastify.prisma.member, 'delete').mockResolvedValue(user);
      jest.spyOn(fastify.redis, 'del').mockRejectedValue(new Error());
      await expect(service.deleteUser(user.uuid_key)).rejects.toThrow(
        'Failed to delete refresh token from server',
      );
    });
  });
});
