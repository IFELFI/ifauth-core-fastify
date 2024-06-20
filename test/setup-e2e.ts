import { auto_login_code } from '@prisma/client';
import { afterAll, afterEach, beforeAll, expect } from '@jest/globals';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import { Client } from 'pg';
import { RedisClientType, createClient } from 'redis';
import { AccessTokenPayloadData } from '../src/interfaces/token.interface';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import cookie from '@fastify/cookie';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import { password, profile, users, provider, provider_type } from '@prisma/client';

let postgresContainer: StartedPostgreSqlContainer;
let postgresClient: Client;

// Start the PostgreSQL container and run the migrations before running the tests
beforeAll(async () => {
  postgresContainer = await new PostgreSqlContainer().start();
  postgresClient = new Client({
    connectionString: postgresContainer.getConnectionUri(),
  });
  await postgresClient.connect();
  execSync('npx prisma migrate dev', {
    env: { ...process.env, DATABASE_URL: postgresContainer.getConnectionUri() },
  });
}, 30000);

let redisContainer: StartedRedisContainer;
let redisClient: RedisClientType;

// Start the Redis container
beforeAll(async () => {
  redisContainer = await new RedisContainer().start();
  redisClient = createClient({
    url: redisContainer.getConnectionUrl(),
  });
  await redisClient.connect();
  expect(redisClient.isOpen).toBeTruthy();
}, 30000);

afterAll(async () => {
  // Close the PostgreSQL connection and stop the container
  await postgresClient.end();
  await postgresContainer.stop();
  // Close the Redis connection and stop the container
  await redisClient.quit();
  await redisContainer.stop();
});

afterEach(async () => {
  // Clear the database after each test
  await postgresClient.query('DELETE FROM "member"."users"');
  await postgresClient.query('DELETE FROM "member"."profile"');
  await postgresClient.query('DELETE FROM "auth"."password"');
  await postgresClient.query('DELETE FROM "auth"."provider"');
  await postgresClient.query('DELETE FROM "auth"."social_info"');
  await postgresClient.query('DELETE FROM "auth"."auto_login_code"');
  await redisClient.flushAll();
});

if (!process.env.COOKIE_SECRET) {
  throw new Error('COOKIE_SECRET is not defined');
}

const signer = cookie.signerFactory(process.env.COOKIE_SECRET);

export {
  postgresClient,
  redisClient,
  postgresContainer,
  redisContainer,
  signer,
};

export const setupData = async () => {
  const createTestUser = async (
    email: string = 'test2@ifelfi.com',
    nickname: string = 'test',
    pass: string = 'password',
    prov: provider_type = 'local',
  ): Promise<{
    user: users;
    profile: profile;
    password: password;
    provider: provider;
    salt: string;
    realPassword: string;
    autoLoginCode: auto_login_code;
  }> => {
    const salt = bcrypt.genSaltSync(10);
    const userData = {
      uuidKey: uuidv4(),
      email: email,
    };
    const user = await postgresClient.query(
      `INSERT INTO "member"."users" (email, uuid_key) VALUES ('${userData.email}', '${userData.uuidKey}') RETURNING *;`,
    );
    const profileData = {
      nickname: nickname,
      imageUrl: null,
    };
    const profile = await postgresClient.query(
      `INSERT INTO "member"."profile" (user_id, nickname, image_url) VALUES (${user.rows[0].id}, '${profileData.nickname}', '${profileData.imageUrl}') RETURNING *;`,
    );
    const passwordData = {
      password: pass,
    };
    const hashedPassword = await bcrypt.hash(passwordData.password, salt);
    const password = await postgresClient.query(
      `INSERT INTO "auth"."password" (user_id, password) VALUES (${user.rows[0].id}, '${hashedPassword}') RETURNING *;`,
    );
    const providerData = {
      provider: prov,
    };
    const provider = await postgresClient.query(
      `INSERT INTO "auth"."provider" (user_id, provider) VALUES (${user.rows[0].id}, '${providerData.provider}') RETURNING *;`,
    );
    const autoLoginCode = await postgresClient.query(
      `INSERT INTO "auth"."auto_login_code" (user_id, code, expire_date, target_address) VALUES (${user.rows[0].id}, 'code', NOW() + INTERVAL '1 day', 'address') RETURNING *;`,
    );

    return {
      user: user.rows[0],
      profile: profile.rows[0],
      password: password.rows[0],
      provider: provider.rows[0],
      salt: salt,
      realPassword: pass,
      autoLoginCode: autoLoginCode.rows[0],
    };
  };

  const issueAccessToken = (
    payload: AccessTokenPayloadData,
    expiresIn: string = '15m',
  ) => {
    if (!process.env.TOKEN_SECRET) {
      throw new Error('TOKEN_SECRET is not defined');
    }
    return jwt.sign(payload, process.env.TOKEN_SECRET, {
      expiresIn: expiresIn,
      issuer: 'ifelfi.com',
    });
  };

  const issueRefreshToken = (expiresIn: string = '30d') => {
    if (!process.env.TOKEN_SECRET) {
      throw new Error('TOKEN_SECRET is not defined');
    }
    return jwt.sign({}, process.env.TOKEN_SECRET, {
      expiresIn: expiresIn,
      issuer: 'ifelfi.com',
    });
  };

  if (!process.env.TOKEN_SECRET) {
    throw new Error('TOKEN_SECRET is not defined');
  }

  const user = await createTestUser();
  const accessPayload: AccessTokenPayloadData = {
    uuidKey: user.user.uuid_key,
    email: user.user.email,
    nickname: user.profile.nickname,
    imageUrl: user.profile.image_url,
  };
  const accessToken = {
    normal: issueAccessToken(accessPayload),
    expired: issueAccessToken(accessPayload, '0ms'),
    wrongPayload: jwt.sign({ wrong: 'payload' }, process.env.TOKEN_SECRET, {
      expiresIn: '15m',
      issuer: 'ifelfi.com',
    }),
    wrongSecret: jwt.sign(accessPayload, 'wrong_secret', {
      expiresIn: '15m',
      issuer: 'ifelfi.com',
    }),
  };
  const refreshToken = {
    normal: issueRefreshToken(),
    expired: issueRefreshToken('0ms'),
    wrongPayload: jwt.sign({ wrong: 'payload' }, process.env.TOKEN_SECRET, {
      expiresIn: '30d',
      issuer: 'ifelfi.com',
    }),
    wrongSecret: jwt.sign({}, 'wrong_secret', {
      expiresIn: '30d',
      issuer: 'ifelfi.com',
    }),
  };

  return {
    user: user,
    accessToken: accessToken,
    refreshToken: refreshToken,
  };
};