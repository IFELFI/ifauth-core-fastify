import { FastifyInstance, FastifyRequest } from 'fastify';
import {
  AccessTokenPayloadData,
  AccessTokenPayload,
  TokenPair,
  RefreshTokenPayload,
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
      throw this.#fastify.httpErrors.notFound('User not found');

    const AccessTokenPayload: AccessTokenPayloadData = {
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
   * Verify access token
   * @param token Access token to verify
   * @returns Verification result
   */
  public async verifyAccessToken(
    token: string,
  ): Promise<{ result: boolean; payload: AccessTokenPayload | null }> {
    let payload: AccessTokenPayload | null = null;
    let result: boolean = false;
    try {
      payload = this.#fastify.jwt.verify<AccessTokenPayload>(token);
      result = true;
    } catch (error: any) {
      if (
        error.code === 'FAST_JWT_EXPIRED' || // fastify-jwt
        error.name === 'TokenExpiredError' // jsonwebtoken
      ) {
        payload = this.#fastify.jwt.decode<AccessTokenPayload>(token, {
          complete: false,
        });
      }
    }
    if (payload === null) {
      return { result: false, payload: null };
    }
    const isValidPayload =
      this.#fastify.typia.equals<AccessTokenPayload>(payload);
    if (!isValidPayload) {
      const result = this.#fastify.typia.validateEquals<AccessTokenPayload>(payload);
      const message = result.errors.map((error) => `path: ${error.path} expected: ${error.expected} value: ${error.value}`).join(', ')
      this.#fastify.log.error(message);
      return { result: false, payload: null };
    }
    return { result: result, payload };
  }

  /**
   * Verify refresh token
   * @param token Refresh token to verify
   */
  public async verifyRefreshToken(
    token: string,
    uuidKey: string,
  ): Promise<boolean> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.#fastify.jwt.verify<RefreshTokenPayload>(token, {
        onlyCookie: true,
      });
    } catch (error) {
      return false;
    }
    const isValidPayload =
      this.#fastify.typia.equals<RefreshTokenPayload>(payload);
    if (!isValidPayload) {
      return false;
    }
    const savedRefreshToken = await this.#fastify.redis.get(uuidKey);
    if (savedRefreshToken === null || token !== savedRefreshToken) {
      return false;
    }
    return true;
  }

  /**
   * Refresh token pair
   * @param payloadData Payload data to create new access token
   * @returns Token pair with new access and refresh tokens
   */
  public async refresh(
    payloadData: AccessTokenPayloadData,
  ): Promise<TokenPair> {
    const isValidPayloadData =
      this.#fastify.typia.equals<AccessTokenPayloadData>(payloadData);
    if (!isValidPayloadData) {
      throw new Error('Payload data is invalid');
    }
    const newAccessToken: string = this.#fastify.jwt.sign(payloadData, {
      expiresIn: this.#fastify.config.ACCESS_TOKEN_EXPIRATION,
    });
    const newRefreshToken: string = this.#fastify.jwt.sign(
      {},
      {
        expiresIn: this.#fastify.config.REFRESH_TOKEN_EXPIRATION,
      },
    );
    this.#fastify.redis.set(payloadData.uuidKey, newRefreshToken);
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Validate and refresh token pair
   * @param tokenPair Pair of access and refresh tokens
   * @returns Token pair with new access and refresh tokens
   */
  public async validateOrRefresh(tokenPair: TokenPair) {
    const { accessToken, refreshToken } = tokenPair;

    const verifyAccessTokenResult = await this.verifyAccessToken(accessToken);

    // If access token is valid, return token pair
    if (verifyAccessTokenResult.result === true) {
      return tokenPair;
    }
    // If access token is expired and refresh token is valid, refresh token pair
    else if (
      verifyAccessTokenResult.result === false &&
      verifyAccessTokenResult.payload !== null
    ) {
      const verifyRefreshTokenResult = await this.verifyRefreshToken(
        refreshToken,
        verifyAccessTokenResult.payload.uuidKey,
      );

      if (verifyRefreshTokenResult === false)
        throw this.#fastify.httpErrors.unauthorized(
          'Refresh token is invalid error',
        );

      const newAccessTokenPayload: AccessTokenPayloadData = {
        uuidKey: verifyAccessTokenResult.payload.uuidKey,
        email: verifyAccessTokenResult.payload.email,
        nickname: verifyAccessTokenResult.payload.nickname,
        imageUrl: verifyAccessTokenResult.payload.imageUrl,
      };

      const refreshedPair = await this.refresh(newAccessTokenPayload);
      return refreshedPair;
    }
    // If access token is invalid, throw error
    else {
      throw this.#fastify.httpErrors.unauthorized(
        'Access token is invalid error',
      );
    }
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
