/**
 * httpOnly cookie holding the merchant session. In mock mode it is the
 * merchant id; in live mode it is the backend's refresh token.
 */
export const SESSION_COOKIE = "payvia_session";

/** httpOnly cookie holding the backend's short-lived access token (live mode). */
export const ACCESS_COOKIE = "payvia_access";
