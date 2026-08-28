/**
 * The access token lives only in memory - never localStorage/sessionStorage,
 * to reduce the blast radius of an XSS bug (a malicious script could still
 * read it from memory if it can execute at all, but it can't read it from
 * disk/storage after the tab closes, and it can't be exfiltrated via a
 * separate storage-reading payload).
 *
 * The refresh token is an httpOnly cookie the browser manages automatically;
 * this app never touches it directly.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
