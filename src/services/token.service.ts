import { FastifyInstance, FastifyRequest } from 'fastify';
import {
  AccessTokenPayload,
  TokenPair,
  isAccessTokenPayload,
} from '../interfaces/token.interface';
import { randomBytes } from 'crypto';

export class TokenService {
  #fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.#fastify = fastify;
  }

  /**
   * Issue authorization code
   * @param id User id
   * @returns Authorization code
   */
  public async issueAuthorizationCode(id: number): Promise<string> {
    const code = randomBytes(16).toString('hex');
    await this.#fastify.redis
      .set(code, id.toString(), 'EX', this.#fastify.config.AUTH_CODE_EXPIRATION)
      .catch(() => {
        throw this.#fastify.httpErrors.internalServerError('Set code error');
      });
    return code;
  }

  /**
   * Issue token pair by user id
   * @param id User id
   * @returns Token pair
   */
  public async issueTokenPairByUserId(id: number): Promise<TokenPair> {
    const searchUser = await this.#fastify.prisma.users.findUnique({
      where: { id },
    });
    const profile = await this.#fastify.prisma.profile.findUnique({
      where: { user_id: id },
    });

    if (searchUser === null || profile === null)
      throw this.#fastify.httpErrors.internalServerError('User not found');

    const AccessTokenPayload: AccessTokenPayload = {
      uuidKey: searchUser.uuid_key,
      email: searchUser.email,
      nickname: profile.nickname,
      imageUrl: profile.image_url,
    };

    const accessToken = this.#fastify.jwt.sign(AccessTokenPayload, {
      expiresIn: this.#fastify.config.ACCESS_TOKEN_EXPIRATION,
    });
    const refreshToken = this.#fastify.jwt.sign(
      {},
      { expiresIn: this.#fastify.config.REFRESH_TOKEN_EXPIRATION },
    );

    this.#fastify.redis.set(searchUser.uuid_key, refreshToken);

    return { accessToken, refreshToken };
  }

  /**
   * Issue token pair by authorization code
   * @param code code to issue token pair
   * @returns Token pair
   */
  public async issueTokenPairByAuthCode(code: string): Promise<TokenPair> {
    const id = await this.#fastify.redis
      .get(code)
      .catch(() => {
        throw this.#fastify.httpErrors.internalServerError('Get code error');
      })
      .then(async (result) => {
        if (result === null)
          throw this.#fastify.httpErrors.notFound('Code not found');
        if (result.match(/^[0-9]+$/) === null)
          throw this.#fastify.httpErrors.internalServerError('Code error');

        await this.#fastify.redis.del(code).catch(() => {
          throw this.#fastify.httpErrors.internalServerError(
            'Delete code error',
          );
        });
        return parseInt(result);
      });

      const tokenPair = await this.issueTokenPairByUserId(id);
      return tokenPair;
  }

  /**
   * Check if token is valid or expired
   * @param token Token to validate
   * @param accessToken If true, validate access token. Otherwise, validate refresh token
   * @returns Validation result
   */
  public async isValidOrExpired(
    token: string,
    accessToken: boolean,
  ): Promise<{ result: boolean; payload?: AccessTokenPayload }> {
    try {
      if (accessToken) {
        // If access token, verify with secret key
        const payload = this.#fastify.jwt.verify<AccessTokenPayload>(token);
        if (isAccessTokenPayload(payload) === false)
          throw new Error('Access token is invalid');
        return { result: true, payload };
      } else {
        // If refresh token, verify it
        this.#fastify.jwt.verify<{}>(token, { onlyCookie: true });
        return { result: true };
      }
    } catch (error) {
      if (accessToken) {
        const payload = this.#fastify.jwt.decode<AccessTokenPayload>(token, {
          complete: false,
        });
        if (isAccessTokenPayload(payload) === true)
          return { result: false, payload };
      } else {
        return { result: false };
      }
      throw new Error('Token is invalid');
    }
  }

  /**
   * Validate token pair
   * @param tokenPair Pair of access and refresh tokens
   * @returns Validation result
   */
  public async validate(tokenPair: TokenPair): Promise<boolean> {
    const { accessToken, refreshToken } = tokenPair;

    try {
      // Check if access token is valid or expired
      const accessTokenResult = await this.isValidOrExpired(accessToken, true);

      // If access token is expired, check if refresh token is valid
      if (
        accessTokenResult.result === false &&
        accessTokenResult.payload !== undefined
      ) {
        const refreshTokenResult = await this.isValidOrExpired(
          refreshToken,
          false,
        );
        // If refresh token is invalid, return false
        if (refreshTokenResult.result === false) return false;
        // Get saved refresh token from database
        const savedRefreshToken = await this.#fastify.redis.get(
          accessTokenResult.payload.uuidKey,
        );
        // If saved refresh token is different from the one in request, return false
        if (savedRefreshToken === null || refreshToken !== savedRefreshToken)
          return false;
        return true;
      } else if (accessTokenResult.result === true) {
        // If access token is valid, return true
        return true;
      } else {
        // If none of the above, return false
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate and refresh token pair
   * @param tokenPair Pair of access and refresh tokens
   * @returns Token pair with new access and refresh tokens
   */
  public async validateAndRefresh(tokenPair: TokenPair) {
    const verifyResult = await this.validate(tokenPair);
    if (verifyResult === false)
      throw this.#fastify.httpErrors.unauthorized('Token is invalid error');
    const payload = this.#fastify.jwt.decode<AccessTokenPayload>(
      tokenPair.accessToken,
      { complete: false },
    );
    if (payload === null)
      throw this.#fastify.httpErrors.unauthorized('Token is invalid error');

    // If access token is valid, generate new access and refresh tokens
    const newAccessTokenPayload: AccessTokenPayload = {
      uuidKey: payload.uuidKey,
      email: payload.email,
      nickname: payload.nickname,
      imageUrl: payload.imageUrl,
    };
    const newAccessToken = this.#fastify.jwt.sign(newAccessTokenPayload, {
      expiresIn: this.#fastify.config.ACCESS_TOKEN_EXPIRATION,
    });
    const newRefreshToken = this.#fastify.jwt.sign(
      {},
      { expiresIn: this.#fastify.config.REFRESH_TOKEN_EXPIRATION },
    );
    this.#fastify.redis.set(payload.uuidKey, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Parse token pair from request
   * @param request Fastify request
   * @returns Token pair
   */
  public async parseTokenPair(request: FastifyRequest): Promise<TokenPair> {
    const accessToken = request.headers.authorization?.split(' ')[1];
    const unsignedRefreshCookie = request.unsignCookie(
      request.cookies.refresh ?? '',
    );
    const refreshToken = unsignedRefreshCookie.value;

    if (accessToken === undefined)
      throw this.#fastify.httpErrors.unauthorized('Access token is required');
    if (refreshToken === null)
      throw this.#fastify.httpErrors.unauthorized('Refresh token is required');

    return { accessToken, refreshToken };
  }
}
