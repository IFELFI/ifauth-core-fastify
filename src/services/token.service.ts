import { FastifyInstance, FastifyRequest } from 'fastify';
import { AccessTokenPayload, TokenPair } from '../interfaces/token.interface';

export class TokenService {
  #fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.#fastify = fastify;
  }

  /**
   * Validate token pair
   * @param tokenPair Pair of access and refresh tokens
   * @returns Validation result
   */
  public async validate(tokenPair: TokenPair): Promise<boolean> {
    const { accessToken, refreshToken } = tokenPair;

    try {
      // Check if access token is valid
      const payload = this.#fastify.jwt.verify<AccessTokenPayload>(accessToken);
      return true;
    } catch (error) {}
    try {
      const payload = this.#fastify.jwt.decode<AccessTokenPayload>(accessToken);
      if (payload === null) throw new Error('Access token is invalid');
      const savedRefreshToken = await this.#fastify.redis.get(payload.uuidKey);
      if (savedRefreshToken === null)
        throw new Error('Refresh token is invalid');

      // Check if refresh token is valid
      if (refreshToken !== savedRefreshToken)
        throw new Error('Refresh token is not matching');
      this.#fastify.jwt.verify<{}>(refreshToken, { onlyCookie: true });
    } catch (error) {
      return false;
    }
    return true;
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
    );
    if (payload === null)
      throw this.#fastify.httpErrors.unauthorized('Token is invalid error');

    // If access token is valid, generate new access and refresh tokens
    const newAccessToken = this.#fastify.jwt.sign(payload, {
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
