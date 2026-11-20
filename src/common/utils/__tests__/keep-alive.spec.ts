import { createServer, request, Agent, type Server } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';
import {
  DEFAULT_KEEP_ALIVE_TIMEOUT_MS,
  applyKeepAliveTimeout,
  keepAliveTimeoutMs,
} from '../keep-alive';

describe('keep-alive timeout (SUP-1182)', () => {
  it('defaults above the load balancer’s 60 s idle timeout', () => {
    expect(DEFAULT_KEEP_ALIVE_TIMEOUT_MS).toBeGreaterThan(60_000);
    expect(keepAliveTimeoutMs(undefined)).toBe(DEFAULT_KEEP_ALIVE_TIMEOUT_MS);
    expect(keepAliveTimeoutMs('')).toBe(DEFAULT_KEEP_ALIVE_TIMEOUT_MS);
  });

  it('takes KEEP_ALIVE_TIMEOUT when it is a positive whole number of ms', () => {
    expect(keepAliveTimeoutMs('125000')).toBe(125_000);
    expect(keepAliveTimeoutMs(' 65000 ')).toBe(65_000);
  });

  /* Falling back to 65 s, not to Node's 5 s, because a typo must not bring
     the 502s back. */
  it.each(['abc', '0', '-1', '65.5', '65s', 'Infinity'])('keeps the default for %j', (raw) => {
    expect(keepAliveTimeoutMs(raw)).toBe(DEFAULT_KEEP_ALIVE_TIMEOUT_MS);
  });

  it('sets the server and reports what it set', () => {
    const server = { keepAliveTimeout: 5_000 };
    expect(applyKeepAliveTimeout(server, '70000')).toBe(70_000);
    expect(server.keepAliveTimeout).toBe(70_000);
  });

  it('reads KEEP_ALIVE_TIMEOUT from the environment by default', () => {
    const before = process.env.KEEP_ALIVE_TIMEOUT;
    process.env.KEEP_ALIVE_TIMEOUT = '90000';
    try {
      const server = { keepAliveTimeout: 5_000 };
      expect(applyKeepAliveTimeout(server)).toBe(90_000);
    } finally {
      if (before === undefined) delete process.env.KEEP_ALIVE_TIMEOUT;
      else process.env.KEEP_ALIVE_TIMEOUT = before;
    }
  });

  /* The real thing, on a real socket: main.ts applies the setting AFTER
     listen(), so prove a listening server honours it. A connection idle for
     7 s (past Node's 5 s default) must still answer its next request. */
  describe('on a listening server', () => {
    let server: Server;
    let agent: Agent;

    beforeEach(async () => {
      server = createServer((_req, res) => res.end('ok'));
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      agent = new Agent({ keepAlive: true, maxSockets: 1 });
    });

    afterEach(async () => {
      agent.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    const get = () =>
      new Promise<{ socket: Socket; body: string }>((resolve, reject) => {
        const { port } = server.address() as AddressInfo;
        const req = request({ host: '127.0.0.1', port, path: '/', agent }, (res) => {
          let body = '';
          res.on('data', (chunk: Buffer) => (body += chunk.toString()));
          res.on('end', () => resolve({ socket: req.socket as Socket, body }));
        });
        req.on('error', reject);
        req.end();
      });

    const idle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    it('without it, Node closes the idle connection after 5 s (control)', async () => {
      const first = await get();
      await idle(7_000);
      expect(first.socket.destroyed).toBe(true);
    }, 15_000);

    it('with it, the idle connection answers its next request', async () => {
      applyKeepAliveTimeout(server, '10000');
      const first = await get();
      await idle(7_000);
      expect(first.socket.destroyed).toBe(false);
      const second = await get();
      expect(second.body).toBe('ok');
      expect(second.socket).toBe(first.socket);
    }, 15_000);
  });
});
