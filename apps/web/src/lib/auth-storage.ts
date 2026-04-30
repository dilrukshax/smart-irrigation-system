const ACCESS_TOKEN_KEY = 'asi_access_token';
const REFRESH_TOKEN_KEY = 'asi_refresh_token';
const USER_KEY = 'asi_user';
const DEFAULT_SESSION_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storage = window.localStorage as Partial<Storage> | undefined;
  if (!storage) {
    return null;
  }

  if (
    typeof storage.getItem !== 'function' ||
    typeof storage.setItem !== 'function' ||
    typeof storage.removeItem !== 'function'
  ) {
    return null;
  }

  return storage as Storage;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getTokenRemainingSeconds(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;

  if (typeof exp !== 'number') {
    return null;
  }

  const remaining = exp - Math.floor(Date.now() / 1000);
  return Math.max(0, remaining);
}

function setAccessTokenCookie(token: string, refreshToken?: string | null): void {
  if (typeof document === 'undefined') {
    return;
  }

  const maxAge =
    (refreshToken ? getTokenRemainingSeconds(refreshToken) : null) ??
    DEFAULT_SESSION_COOKIE_MAX_AGE_SECONDS;

  document.cookie = `${ACCESS_TOKEN_KEY}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearAccessTokenCookie(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; max-age=0`;
}

export function saveAuthSession<TUser>(
  accessToken: string,
  refreshToken: string,
  user?: TUser
): void {
  const storage = getBrowserStorage();
  storage?.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage?.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (user !== undefined) {
    storage?.setItem(USER_KEY, JSON.stringify(user));
  }

  setAccessTokenCookie(accessToken, refreshToken);
}

export function updateAccessToken(accessToken: string, refreshToken?: string): void {
  const storage = getBrowserStorage();
  storage?.setItem(ACCESS_TOKEN_KEY, accessToken);

  let effectiveRefreshToken = refreshToken ?? null;
  if (refreshToken) {
    storage?.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    effectiveRefreshToken = storage?.getItem(REFRESH_TOKEN_KEY) ?? null;
  }

  setAccessTokenCookie(accessToken, effectiveRefreshToken);
}

export function clearAuthSession(): void {
  const storage = getBrowserStorage();
  storage?.removeItem(ACCESS_TOKEN_KEY);
  storage?.removeItem(REFRESH_TOKEN_KEY);
  storage?.removeItem(USER_KEY);
  clearAccessTokenCookie();
}

export function getAccessToken(): string | null {
  return getBrowserStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  return getBrowserStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function getStoredUser<TUser>(): TUser | null {
  try {
    const storage = getBrowserStorage();
    if (!storage) {
      return null;
    }

    const stored = storage.getItem(USER_KEY);
    if (!stored) {
      return null;
    }

    return JSON.parse(stored) as TUser;
  } catch {
    return null;
  }
}
