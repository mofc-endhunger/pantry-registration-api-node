import { JwtService } from '@nestjs/jwt';
import { PantryTrakClient } from '../pantrytrak.client';

describe('PantryTrakClient.createUser', () => {
  const ENV = {
    PANTRY_TRAK_ENABLED: 'true',
    PANTRY_TRAK_API_URL: 'https://pt.example.test/',
    PANTRY_TRAK_TOKEN: 'token',
    PANTRY_TRAK_SECRET: 'secret',
  };
  const saved: Record<string, string | undefined> = {};
  let fetchMock: jest.Mock;
  let client: PantryTrakClient;

  beforeEach(() => {
    for (const [k, v] of Object.entries(ENV)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
      headers: new Map(),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    client = new PantryTrakClient({ sign: () => 'signed' } as unknown as JwtService);
  });
  afterEach(() => {
    for (const k of Object.keys(ENV)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  /** The JSON body of the one POST sent. */
  const sentBody = () =>
    JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body) as Record<
      string,
      unknown
    >;

  const HOMELESS = {
    id: 10,
    cognito_uuid: Buffer.alloc(16),
    address_line_1: null,
    address_line_2: 'Homeless',
    city: 'Columbus',
    state: 'OH',
    zip_code: '43215',
  };

  it("sends a homeless user with the event's address (SUP-1141)", async () => {
    await client.createUser(HOMELESS, {
      eventAddress: { address1: '222 Gantz Rd', city: 'Grove City', state: 'OH', zip: '43123' },
    });

    expect(sentBody()).toEqual({
      id: 10,
      address_line_1: '222 Gantz Rd',
      address_line_2: 'Homeless',
      city: 'Grove City',
      state: 'OH',
      zip_code: '43123',
    });
  });

  it('sends a homeless user without an event with no city or ZIP of their own', async () => {
    await client.createUser(HOMELESS);

    expect(sentBody()).toEqual({
      id: 10,
      address_line_1: null,
      address_line_2: 'Homeless',
      city: null,
      state: null,
      zip_code: null,
    });
  });

  it('sends anyone else as they are, without cognito_uuid', async () => {
    await client.createUser(
      { ...HOMELESS, address_line_1: '123 Main St', address_line_2: null },
      { eventAddress: { address1: '222 Gantz Rd', city: 'Grove City', state: 'OH', zip: '43123' } },
    );

    expect(sentBody()).toEqual({
      id: 10,
      address_line_1: '123 Main St',
      address_line_2: null,
      city: 'Columbus',
      state: 'OH',
      zip_code: '43215',
    });
  });
});
