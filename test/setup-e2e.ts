import { afterAll, beforeAll, expect } from '@jest/globals'
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
import 'dotenv/config';

let postgresContainer: StartedPostgreSqlContainer;
let postgresClient: Client;

// Start the PostgreSQL container and run the migrations before running the tests
beforeAll(async () => {
  postgresContainer = await new PostgreSqlContainer().start();
  postgresClient = new Client({ connectionString: postgresContainer.getConnectionUri() });
  await postgresClient.connect();
  execSync('npx prisma migrate dev', { env: { ...process.env, DATABASE_URL: postgresContainer.getConnectionUri() } });
}, 10000)

let redisContainer: StartedRedisContainer;
let redisClient: RedisClientType;

// Start the Redis container
beforeAll(async () => {
  redisContainer = await new RedisContainer().start();
  redisClient = createClient({
    url: redisContainer.getConnectionUrl(),
  })
  await redisClient.connect();
  expect(redisClient.isOpen).toBeTruthy();
}, 10000)

afterAll(async () => {
  // Close the PostgreSQL connection and stop the container
  await postgresClient.end();
  await postgresContainer.stop();
  // Close the Redis connection and stop the container
  await redisClient.quit();
  await redisContainer.stop();
})

if (!process.env.TOKEN_SECRET) {
  throw new Error('TOKEN_SECRET is not defined')
}

if (!process.env.COOKIE_SECRET) {
  throw new Error('COOKIE_SECRET is not defined')
}

const accessTokenPayload: AccessTokenPayload = {
  uuidKey: uuidv4(),
  email: 'test@ifelfi.com',
  nickname: 'test',
  imageUrl: null,
}
const accessToken: string = jwt.sign(accessTokenPayload, process.env.TOKEN_SECRET, { expiresIn: '15m', issuer: 'ifelfi.com' });

const expiredAccessTokenPayload: AccessTokenPayload = {
  uuidKey: uuidv4(),
  email: 'expired@ifelfi.com',
  nickname: 'expired',
  imageUrl: null,
}
const expiredAccessToken: string = jwt.sign(expiredAccessTokenPayload, process.env.TOKEN_SECRET, { expiresIn: '0ms', issuer: 'ifelfi.com' });

const refreshToken = jwt.sign({}, process.env.TOKEN_SECRET, { expiresIn: '30d' });
const expiredRefreshToken = jwt.sign({}, process.env.TOKEN_SECRET, { expiresIn: '0ms' });

const signer = cookie.signerFactory(process.env.COOKIE_SECRET);

const createLocalUser = async (email: string, nickname: string, password: string) => {
  if (!process.env.TOKEN_SECRET) {
    throw new Error('TOKEN_SECRET is not defined')
  }

  const user = await postgresClient.query(
    `INSERT INTO "member"."users" (email) VALUES (${email}) RETURNING *`
  )
  postgresClient.query(
    `INSERT INTO "member"."profile" (user_id, nickname, image_url) VALUES (${user.rows[0].id}, ${nickname}, null)`
  )
  postgresClient.query(
    `INSERT INTO "auth"."password" (user_id, password) VALUES (${user.rows[0].id}, ${password})`
  )
  postgresClient.query(
    `INSERT INTO "auth"."provider" (user_id, provider) VALUES (${user.rows[0].id}, 'local')`
  )

  return { uuidKey: user.rows[0].uuid_key as string, accessToken: jwt.sign(user.rows[0].uuid_key, process.env.TOKEN_SECRET, { expiresIn: '15m', issuer: 'ifelfi.com' }) }
}

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
}