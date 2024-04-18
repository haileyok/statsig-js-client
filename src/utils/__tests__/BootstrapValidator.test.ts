/**
 * @jest-environment jsdom
 */

import StatsigClient from '../../StatsigClient';
import BootstrapValidator from '../BootstrapValidator';
import { EvaluationReason } from '../EvaluationReason';
import * as TestData from '../../__tests__/initialize_response.json';
import LocalStorageMock from '../../__tests__/LocalStorageMock';

describe('BootstrapValidator', () => {
  it('returns true when no keys are provided', () => {
    expect(
      BootstrapValidator.getEvaluationReasonForBootstrap({}, {}, null),
    ).toBe(EvaluationReason.Bootstrap);
  });

  it('returns true when stable id is present', () => {
    expect(
      BootstrapValidator.getEvaluationReasonForBootstrap(
        {},
        {
          evaluated_keys: {
            stableID: 'a-stable-id',
            customIDs: {
              stableID: 'a-stable-id',
            },
          },
        },
        'a-stable-id',
      ),
    ).toBe(EvaluationReason.Bootstrap);
  });

  it('returns true when user matched evaluted_keys', () => {
    const result = BootstrapValidator.getEvaluationReasonForBootstrap(
      { userID: 'a-user-id', customIDs: { workID: 'a-work-id' } },
      {
        evaluated_keys: {
          userID: 'a-user-id',
          customIDs: {
            stableID: 'a-stable-id',
            workID: 'a-work-id',
          },
        },
      },
      'a-stable-id',
    );

    expect(result).toBe(EvaluationReason.Bootstrap);
  });

  it('returns false when userid doesnt match empty evaluted_keys', () => {
    const result = BootstrapValidator.getEvaluationReasonForBootstrap(
      { userID: 'a-user-id' },
      {
        evaluated_keys: {},
      },
      null,
    );

    expect(result).toBe(EvaluationReason.InvalidBootstrap);
  });

  it('returns false when customid doesnt match empty evaluted_keys', () => {
    const result = BootstrapValidator.getEvaluationReasonForBootstrap(
      { customIDs: { workID: 'a-work-id' } },
      {
        evaluated_keys: {},
      },
      null,
    );

    expect(result).toBe(EvaluationReason.InvalidBootstrap);
  });

  it('returns false when customid doesnt match empty user', () => {
    const result = BootstrapValidator.getEvaluationReasonForBootstrap(
      {},
      {
        evaluated_keys: {
          customIDs: { workID: 'a-work-id' },
        },
      },
      null,
    );

    expect(result).toBe(EvaluationReason.InvalidBootstrap);
  });

  it('returns false when userid doesnt match empty user', () => {
    const result = BootstrapValidator.getEvaluationReasonForBootstrap(
      {},
      {
        evaluated_keys: { userID: 'a-user-id' },
      },
      null,
    );

    expect(result).toBe(EvaluationReason.InvalidBootstrap);
  });

  it('returns false when userID does not match', () => {
    const result = BootstrapValidator.getEvaluationReasonForBootstrap(
      { userID: 'a-user-id', customIDs: { workID: 'a-work-id' } },
      {
        evaluated_keys: {
          userID: 'an-invalid-user-id',
          customIDs: {
            stableID: 'a-stable-id',
            workID: 'a-work-id',
          },
        },
      },
      'a-stable-id',
    );
    expect(result).toBe(EvaluationReason.InvalidBootstrap);
  });

  it('returns true by ignoring stableID', () => {
    const result = BootstrapValidator.getEvaluationReasonForBootstrap(
      { userID: 'a-user-id', customIDs: { workID: 'a-work-id' } },
      {
        evaluated_keys: {
          userID: 'a-user-id',
          customIDs: {
            workID: 'a-work-id',
            stableID: 'an-invalid-stable-id',
          },
        },
      },
      null,
    );
    expect(result).toBe(EvaluationReason.BootstrapStableIDMismatch);
  });

  it('returns true by ignoring stableID from user', () => {
    const user = {
      userID: 'a-user-id',
      customIDs: { workID: 'a-work-id', stableID: 'a-stable-id' },
    };
    const result = BootstrapValidator.getEvaluationReasonForBootstrap(
      user,
      {
        evaluated_keys: {
          userID: 'a-user-id',
          customIDs: {
            workID: 'a-work-id',
          },
        },
      },
      'a-stable-id',
    );
    expect(result).toBe(EvaluationReason.BootstrapStableIDMismatch);
  });

  it('returns false when customIDs do not match', () => {
    const result = BootstrapValidator.getEvaluationReasonForBootstrap(
      { userID: 'a-user-id', customIDs: { workID: 'a-work-id' } },
      {
        evaluated_keys: {
          userID: 'a-user-id',
          customIDs: {
            stableID: 'a-stable-id',
            workID: 'an-invalid-work-id',
          },
        },
      },
      null,
    );
    expect(result).toBe(EvaluationReason.InvalidBootstrap);
  });

  it('returns false when customIDs contains more values', () => {
    const result = BootstrapValidator.getEvaluationReasonForBootstrap(
      {
        userID: 'a-user-id',
        customIDs: { workID: 'a-work-id', groupID: 'a-group-id' },
      },
      {
        evaluated_keys: {
          userID: 'a-user-id',
          customIDs: {
            stableID: 'a-stable-id',
            workID: 'a-work-id',
          },
        },
      },
      null,
    );
    expect(result).toBe(EvaluationReason.InvalidBootstrap);
  });
  it('returns true when boostrapping from client generated initialize response', async () => {
    const localStorage = new LocalStorageMock();
    // @ts-ignore
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
    });
    // @ts-ignore
    global.fetch = jest.fn((url, params) => {
      if (url.toString().endsWith('/initialize')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(TestData)),
        });
      }
    });
    const user = { userID: 'a-user-id' };
    const statsig1 = new StatsigClient('client-key', user);
    await statsig1.initializeAsync();
    const initializeValues = JSON.parse(
      statsig1.getInitializeResponseJson().values,
    );
    const statsig2 = new StatsigClient('client-key', user, {
      initializeValues,
    });
    const result =
      statsig2.getInitializeResponseJson().evaluationDetails.reason;
    expect(result).toBe(EvaluationReason.Bootstrap);
  });
});
