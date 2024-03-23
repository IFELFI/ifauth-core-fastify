import { afterAll, afterEach, beforeAll, expect } from '@jest/globals';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import { Client } from 'pg';
import { RedisClientType, createClient } from 'redis';
import { AccessTokenPayload } from '../src/interfaces/token.interface';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import cookie from '@fastify/cookie';
import bcrypt from 'bcrypt';
import 'dotenv/config';

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
  await redisClient.flushAll();
});

const salt = bcrypt.genSaltSync(10);

// Issue an access token
const issueAccessToken = (
  payload: AccessTokenPayload,
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

// Create user with local provider
const createLocalUser = async (
  email: string,
  nickname: string,
  password: string,
) => {
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await postgresClient.query(
    `INSERT INTO "member"."users" (email) VALUES ('${email}') RETURNING *;`,
  );
  await postgresClient.query(
    `INSERT INTO "member"."profile" (user_id, nickname, image_url) VALUES (${user.rows[0].id}, '${nickname}', null)`,
  );
  await postgresClient.query(
    `INSERT INTO "auth"."password" (user_id, password) VALUES (${user.rows[0].id}, '${hashedPassword}')`,
  );
  await postgresClient.query(
    `INSERT INTO "auth"."provider" (user_id, provider) VALUES (${user.rows[0].id}, 'local')`,
  );

  // Payload for access token
  const payload: AccessTokenPayload = {
    uuidKey: user.rows[0].uuid_key as string,
    email: user.rows[0].email as string,
    nickname: nickname,
    imageUrl: null,
  };

  const accessToken = issueAccessToken(payload);
  const expiredAccessToken = issueAccessToken(payload, '0ms');

  return {
    uuidKey: user.rows[0].uuid_key as string,
    accessToken: accessToken,
    expiredAccessToken: expiredAccessToken,
  };
};

// Create default user for testing
const createDefaultLocalUser = async () => {
  return await createLocalUser('test@ifelfi.com', 'test', 'password');
};

if (!process.env.TOKEN_SECRET) {
  throw new Error('TOKEN_SECRET is not defined');
}

if (!process.env.COOKIE_SECRET) {
  throw new Error('COOKIE_SECRET is not defined');
}

// Normal access token
const accessTokenPayload: AccessTokenPayload = {
  uuidKey: uuidv4(),
  email: 'test@ifelfi.com',
  nickname: 'test',
  imageUrl: null,
};
const accessToken = issueAccessToken(accessTokenPayload);

// Expired access token
const expiredAccessTokenPayload: AccessTokenPayload = {
  uuidKey: uuidv4(),
  email: 'expired@ifelfi.com',
  nickname: 'expired',
  imageUrl: null,
};
const expiredAccessToken = jwt.sign(
  expiredAccessTokenPayload,
  process.env.TOKEN_SECRET,
  { expiresIn: '0ms' },
);

// Refresh token
const refreshToken = jwt.sign({}, process.env.TOKEN_SECRET, {
  expiresIn: '30d',
});
const expiredRefreshToken = jwt.sign({}, process.env.TOKEN_SECRET, {
  expiresIn: '0ms',
});

// Cookie signer
const signer = cookie.signerFactory(process.env.COOKIE_SECRET);

export {
  postgresClient,
  redisClient,
  postgresContainer,
  redisContainer,
  accessTokenPayload,
  accessToken,
  expiredAccessTokenPayload,
  expiredAccessToken,
  refreshToken,
  expiredRefreshToken,
  signer,
  issueAccessToken,
  createLocalUser,
  createDefaultLocalUser,
  salt,
};
