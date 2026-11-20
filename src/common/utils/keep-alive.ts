import type { Server } from 'node:http';

/**
 * How long the server keeps an idle connection open (SUP-1182).
 *
 * Node's default is 5 s. The AWS load balancer keeps idle connections for its
 * own idle timeout (60 s by default) and reuses them, so it sends requests
 * down connections Node has already closed. Those come back as 502s that
 * never reach this service's logs. The server must outlast the load balancer:
 * keep this a few seconds above the ALB's idle timeout, and raise both
 * together.
 *
 * Only the keep-alive needs raising. On Node 22 a connection idle for 62 s
 * with this set, and headersTimeout left at its 60 s default, still answered
 * its next request (measured 2026-11-20).
 */
export const DEFAULT_KEEP_ALIVE_TIMEOUT_MS = 65_000;

/** KEEP_ALIVE_TIMEOUT in ms; the default when unset or not a positive whole number. */
export function keepAliveTimeoutMs(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_KEEP_ALIVE_TIMEOUT_MS;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_KEEP_ALIVE_TIMEOUT_MS;
}

/** Sets the server's keep-alive timeout from KEEP_ALIVE_TIMEOUT and returns it. */
export function applyKeepAliveTimeout(
  server: Pick<Server, 'keepAliveTimeout'>,
  raw: string | undefined = process.env.KEEP_ALIVE_TIMEOUT,
): number {
  const ms = keepAliveTimeoutMs(raw);
  server.keepAliveTimeout = ms;
  return ms;
}
