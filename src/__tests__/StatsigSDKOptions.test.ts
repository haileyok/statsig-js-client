/**
 * @jest-environment jsdom
 */
import Statsig, { StatsigClient } from '../index';

describe('Test Statsig options', () => {
  test('init completion callback when there is an error', async () => {
    expect.assertions(4);
    let initTime, initSuccess, initMessage;

    global.fetch = jest.fn((url, params) => {
      return new Promise((resolve, reject) => {
        setTimeout(
          () =>
            // @ts-ignore
            resolve({
              ok: false,
              status: 401,
              text: () => Promise.resolve('error!'),
            }),
          100,
        );
      });
    });

    await Statsig.initialize(
      'client-key',
      { userID: 'jkw' },
      {
        initCompletionCallback: (time, success, message) => {
          initTime = time;
          initSuccess = success;
          initMessage = message;
        },
      },
    );
    expect(typeof initTime).toEqual('number');
    expect(initTime).toBeGreaterThanOrEqual(100);
    expect(initSuccess).toEqual(false);
    expect(initMessage).toEqual('401: error!');
  });

  test('init completion callback when it succeeds', async () => {
    expect.assertions(4);
    let initTime, initSuccess, initMessage;

    global.fetch = jest.fn((url, params) => {
      return new Promise((resolve, reject) => {
        setTimeout(
          () =>
            // @ts-ignore
            resolve({
              ok: true,
              status: 200,
              text: () => Promise.resolve(JSON.stringify({})),
            }),
          100,
        );
      });
    });

    const c = new StatsigClient(
      'client-key',
      { userID: 'jkw' },
      {
        initCompletionCallback: (time, success, message) => {
          initTime = time;
          initSuccess = success;
          initMessage = message;
        },
      },
    );
    await c.initializeAsync();

    expect(typeof initTime).toEqual('number');
    expect(initTime).toBeGreaterThanOrEqual(100);
    expect(initSuccess).toEqual(true);
    expect(initMessage).toBeNull();
  });

  test('init completion callback when it times out', async () => {
    expect.assertions(5);
    let initTime, initSuccess, initMessage;

    global.fetch = jest.fn((url, params) => {
      return new Promise((resolve, reject) => {
        setTimeout(
          () =>
            // @ts-ignore
            resolve({
              ok: true,
              status: 200,
              text: () => Promise.resolve(JSON.stringify({})),
            }),
          100,
        );
      });
    });

    const c = new StatsigClient(
      'client-key',
      { userID: 'jkw' },
      {
        initTimeoutMs: 10,
        initCompletionCallback: (time, success, message) => {
          initTime = time;
          initSuccess = success;
          initMessage = message;
        },
      },
    );
    await c.initializeAsync();

    expect(typeof initTime).toEqual('number');
    expect(initTime).toBeGreaterThanOrEqual(1);
    expect(initTime).toBeLessThanOrEqual(15);
    expect(initSuccess).toEqual(false);
    expect(initMessage).toEqual(
      'The initialization timeout of 10ms has been hit before the network request has completed.',
    );
  });

  test('init completion callback when bootstrapping', async () => {
    expect.assertions(6);
    let initTime, initSuccess, initMessage;
    let timesCalled = 0;

    global.fetch = jest.fn((url, params) => {
      return new Promise((resolve, reject) => {
        setTimeout(
          () =>
            // @ts-ignore
            resolve({
              ok: true,
              status: 200,
              text: () => Promise.resolve(JSON.stringify({})),
            }),
          100,
        );
      });
    });

    const c = new StatsigClient(
      'client-key',
      { userID: 'jkw' },
      {
        initTimeoutMs: 10,
        initCompletionCallback: (time, success, message) => {
          initTime = time;
          initSuccess = success;
          initMessage = message;
          timesCalled++;
        },
      },
    );
    c.setInitializeValues({});

    expect(typeof initTime).toEqual('number');
    expect(initTime).toBeLessThanOrEqual(10);
    expect(initSuccess).toEqual(true);
    expect(initMessage).toBeNull();
    expect(timesCalled).toEqual(1);

    c.setInitializeValues({});
    expect(timesCalled).toEqual(1);
  });
});
