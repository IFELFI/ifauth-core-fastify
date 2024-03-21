import { afterAll, beforeAll, expect } from '@jest/globals'
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { execSync } from 'child_process';
import { log } from 'console';
import { Client } from 'pg';
import { RedisClientType, createClient } from 'redis';

let postgresContainer: StartedPostgreSqlContainer;
let postgresClient: Client;

// Start the PostgreSQL container and run the migrations before running the tests
beforeAll(async () => {
  postgresContainer = await new PostgreSqlContainer().start();
  postgresClient = new Client({ connectionString: postgresContainer.getConnectionUri() });
  await postgresClient.connect();
  execSync('npx prisma migrate dev', { env: { ...process.env, DATABASE_URL: postgresContainer.getConnectionUri() } });
})

let redisContainer: StartedRedisContainer;
let redisClient: RedisClientType;

beforeAll(async () => {
  redisContainer = await new RedisContainer().start();
  redisClient = createClient({
    url: redisContainer.getConnectionUrl(),
  })
  await redisClient.connect();
  expect(redisClient.isOpen).toBeTruthy();
})

afterAll(async () => {
  // Close the PostgreSQL connection and stop the container
  await postgresClient.end();
  await postgresContainer.stop();
  // Close the Redis connection and stop the container
  await redisClient.quit();
  await redisContainer.stop();
})

export {
  postgresClient,
  redisClient,
  postgresContainer,
  redisContainer,
}