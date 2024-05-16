/**
 * @jest-environment jsdom
 */

import DynamicConfig from '../DynamicConfig';
import { ExceptionEndpoint } from '../ErrorBoundary';
import { StatsigInvalidArgumentError } from '../Errors';
import Layer from '../Layer';
import StatsigClient from '../StatsigClient';

describe('Statsig ErrorBoundary Usage', () => {
  let requests: { url: RequestInfo; params: RequestInit }[] = [];
  let client: StatsigClient;
  let responseString: unknown = '{"has_updates": true}';

  function expectSingleError(
    info: string,
    exception: 'TypeError' | 'SyntaxError' | 'Error' = 'TypeError',
    extra: Record<string, unknown> = {},
  ) {
    expect(requests.length).toBe(1);
    const request = requests[0];
    expect(request.url).toEqual(ExceptionEndpoint);
    const body = JSON.parse((request.params.body as string) ?? '');
    expect(body).toMatchObject({
      info: expect.stringContaining(info),
      exception,
      extra,
    });
  }

  beforeEach(async () => {
    responseString = '{"has_updates": true}';
    // @ts-ignore
    global.fetch = jest.fn((url, params) => {
      requests.push({ url: url.toString(), params: params ?? {} });
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(responseString),
      });
    });

    client = new StatsigClient('client-key');
    await client.initializeAsync();

    // @ts-ignore
    client.errorBoundary.seen = new Set();
    requests = [];
    // Causes not a function errors
    // @ts-ignore
    client.store = { isLoaded: () => true };
    // @ts-ignore
    client.logger = 1;
  });

  it('recovers from errors and returns default gate value', async () => {
    const result = client.checkGate('a_gate');
    expect(result).toBe(false);
    expectSingleError('store.checkGate');
  });

  it('recovers from errors and returns default config value', async () => {
    const result = client.getConfig('a_config');
    expect(result instanceof DynamicConfig).toBe(true);
    expectSingleError('store.getConfig');
  });

  it('recovers from errors and returns default experiment value', async () => {
    const result = client.getExperiment('an_experiment');
    expect(result instanceof DynamicConfig).toBe(true);
    expectSingleError('store.getExperiment');
  });

  it('recovers from errors and returns default layer value', async () => {
    const result = client.getLayer('a_layer');
    expect(result instanceof Layer).toBe(true);
    expectSingleError('store.getLayer');
  });

  it('recovers from errors with logEvent', () => {
    client.logEvent('an_event');
    expectSingleError('logger.log');
  });

  it('recovers from errors with shutdown', () => {
    client.shutdown();
    expectSingleError('logger.shutdown');
  });

  it('recovers from errors with overrideGate', () => {
    client.overrideGate('a_gate', true);
    expectSingleError('store.overrideGate');
  });

  it('recovers from errors with overrideConfig', () => {
    client.overrideConfig('a_config', {});
    expectSingleError('store.overrideConfig');
  });

  it('recovers from errors with removeOverride', () => {
    client.removeOverride('something');
    expectSingleError('store.removeGateOverride');
  });

  it('recovers from errors with removeGateOverride', () => {
    client.removeGateOverride('a_gate');
    expectSingleError('store.removeGateOverride');
  });

  it('recovers from errors with removeConfigOverride', () => {
    client.removeConfigOverride('a_config');
    expectSingleError('store.removeConfigOverride');
  });

  it('recovers from errors with getOverrides', () => {
    client.getOverrides();
    expectSingleError('store.getAllOverrides');
  });

  it('recovers from errors with getAllOverrides', () => {
    client.getAllOverrides();
    expectSingleError('store.getAllOverrides');
  });

  it('recovers from errors with setInitializeValues', () => {
    // @ts-ignore
    client.ready = false;

    client.setInitializeValues({});
    expectSingleError('store.bootstrap');
    // @ts-ignore
    expect(client.ready).toBeTruthy();
  });

  it('recovers from errors with getStableID', () => {
    // @ts-ignore
    client.identity = 1;

    client.getStableID();

    expectSingleError('identity.getStatsigMetadata');
  });

  it('recovers from errors with initialize', async () => {
    const localClient = new StatsigClient('client-key');
    // @ts-ignore
    localClient.network = 1;
    await localClient.initializeAsync();
    // @ts-ignore
    expect(localClient.ready).toBeTruthy();
  });

  it('recovers from errors with updateUser', async () => {
    await client.updateUser({ userID: 'jkw' });
    expectSingleError('store.updateUser');
  });

  it('captures crashes in saving', async () => {
    const localClient = new StatsigClient('client-key');
    // @ts-ignore
    localClient.store.save = null;
    await localClient.initializeAsync();
    requests.shift(); // remove the /initialize call
    expectSingleError('this.store.save is not a function');
  });

  it('captures the case when a non JSON 200 is returned', async () => {
    const localClient = new StatsigClient('client-key');
    responseString = 1;
    await localClient.initializeAsync();
    requests.shift(); // rm /initialize call
    expectSingleError(
      "Error: Request to initialize received invalid response type. Expected 'object' but got 'number'",
      'Error',
      expect.objectContaining({
        requestInfo: expect.any(Object),
        responseInfo: expect.any(Object),
      }),
    );
  });

  it('does not capture invalid user object errors', async () => {
    expect(async () => {
      // @ts-ignore
      await client.updateUser(undefined);
    }).rejects.toThrow(StatsigInvalidArgumentError);
  });
});
