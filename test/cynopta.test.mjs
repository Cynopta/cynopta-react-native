import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { Cynopta, _setNativeModuleForTesting } = require('../lib/commonjs/index.js');

function packExpectedResult(score, dev, bot, classCode) {
  const sc = BigInt(Math.round(score * 10000));
  const dv = BigInt(Math.round(dev * 10000));
  const bt = BigInt(Math.round(bot * 10000));
  const cc = BigInt(classCode & 0xff);
  const packed = sc | (dv << 16n) | (bt << 32n) | (cc << 48n) | (1n << 62n);
  return packed.toString(16);
}

function createMockNative(calls, opts = {}) {
  const sealedMap = new Map();
  return {
    async start() {
      calls.push(['start']);
    },
    async stop(deleteAllData) {
      calls.push(['stop', deleteAllData]);
    },
    async isStarted() {
      calls.push(['isStarted']);
      return true;
    },
    async isAuthorized() {
      calls.push(['isAuthorized']);
      return true;
    },
    async getLicenseResult() {
      calls.push(['getLicenseResult']);
      return {
        isAuthorized: true,
        status: 'Authorized',
        reason: 'Valid signature',
      };
    },
    async getVersionName() {
      calls.push(['getVersionName']);
      return '1.0.27';
    },
    async getVersionCode() {
      calls.push(['getVersionCode']);
      return 28;
    },
    async setReportingEnabled(enabled) {
      calls.push(['setReportingEnabled', enabled]);
    },
    async isReportingEnabled() {
      calls.push(['isReportingEnabled']);
      return true;
    },
    async evaluateActionTrust(actionName, nonceHex) {
      calls.push(['evaluateActionTrust', actionName, nonceHex]);
      if (opts.omitPacket) {
        return { actionName, reasons: ['CLEAN_SESSION'] };
      }
      const d = 'sealed-b64-' + nonceHex;
      sealedMap.set(nonceHex + '|' + d, packExpectedResult(0.92, 0.89, 0.03, 1));
      return {
        d,
        c: 'VERIFIED_HUMAN',
        reasons: ['CLEAN_SESSION'],
        attestationPayload: 'att-token',
        timestamp: 1700000000123,
        evaluationLatencyMs: 2,
        actionName,
      };
    },
    async getLatestTrustEvaluation(nonceHex) {
      calls.push(['getLatestTrustEvaluation', nonceHex]);
      const d = 'sealed-latest-' + nonceHex;
      sealedMap.set(nonceHex + '|' + d, packExpectedResult(0.88, 0.91, 0.04, 1));
      return {
        d,
        c: 'VERIFIED_HUMAN',
        reasons: [],
        attestationPayload: 'latest-token',
        timestamp: 1700000000456,
        evaluationLatencyMs: 1,
        actionName: 'GET_TRUST_EVALUATION',
      };
    },
    async unsealPacket(nonceHex, sealedBase64) {
      calls.push(['unsealPacket', nonceHex, sealedBase64]);
      if (opts.forceUnsealZero) {
        return '0';
      }
      return sealedMap.get(nonceHex + '|' + sealedBase64) ?? '0';
    },
  };
}

test('forwards all methods, binds nonce, and verifies sealed packets on Android', async () => {
  const calls = [];
  _setNativeModuleForTesting(createMockNative(calls), 'android');
  try {
    await Cynopta.start();
    await Cynopta.stop();
    await Cynopta.stop({ deleteAllData: true });
    assert.equal(await Cynopta.isStarted(), true);
    assert.equal(await Cynopta.isAuthorized(), true);
    assert.equal(await Cynopta.getVersionName(), '1.0.27');
    assert.equal(await Cynopta.getVersionCode(), 28);

    const license = await Cynopta.getLicenseResult();
    assert.deepEqual(license, {
      isAuthorized: true,
      status: 'Authorized',
      reason: 'Valid signature',
    });

    await Cynopta.setReportingEnabled(false);
    assert.equal(await Cynopta.isReportingEnabled(), true);

    const evalAction = await Cynopta.evaluateActionTrust('WIRE_TRANSFER');
    assert.equal(evalAction.score, 0.92);
    assert.equal(evalAction.classification, 'VERIFIED_HUMAN');
    assert.equal(evalAction.deviceRealnessScore, 0.89);
    assert.equal(evalAction.sessionBotRisk, 0.03);
    assert.deepEqual(evalAction.reasons, ['CLEAN_SESSION']);
    assert.equal(evalAction.attestationPayload, 'att-token');
    assert.equal(evalAction.timestamp, 1700000000123);
    assert.equal(evalAction.evaluationLatencyMs, 2);
    assert.equal(evalAction.actionName, 'WIRE_TRANSFER');

    const evalDefault = await Cynopta.evaluateActionTrust();
    assert.equal(evalDefault.actionName, 'ACTION_DEFAULT');

    const latest = await Cynopta.getLatestTrustEvaluation();
    assert.equal(latest.score, 0.88);
    assert.equal(latest.deviceRealnessScore, 0.91);
    assert.equal(latest.sessionBotRisk, 0.04);
    assert.equal(latest.actionName, 'GET_TRUST_EVALUATION');

    const nonceCalls = calls.filter(
      (c) => c[0] === 'evaluateActionTrust' || c[0] === 'getLatestTrustEvaluation',
    );
    assert.equal(nonceCalls.length, 3);
    for (const c of nonceCalls) {
      const nonceHex = c[c.length - 1];
      assert.match(nonceHex, /^[0-9a-f]{16}$/);
      assert.notEqual(nonceHex, '0000000000000000');
    }
  } finally {
    _setNativeModuleForTesting(undefined, undefined);
  }
});

test('fails closed on missing packet or unsealPacket verification failure on Android', async () => {
  _setNativeModuleForTesting(createMockNative([], { omitPacket: true }), 'android');
  try {
    const res1 = await Cynopta.evaluateActionTrust('WIRE_TRANSFER');
    assert.equal(res1.score, 0.0);
    assert.equal(res1.deviceRealnessScore, 0.0);
    assert.equal(res1.sessionBotRisk, 1.0);
    assert.equal(res1.classification, 'SESSION_HIJACK_RISK');
  } finally {
    _setNativeModuleForTesting(undefined, undefined);
  }

  _setNativeModuleForTesting(createMockNative([], { forceUnsealZero: true }), 'android');
  try {
    const res2 = await Cynopta.evaluateActionTrust('CHECKOUT');
    assert.equal(res2.score, 0.0);
    assert.equal(res2.deviceRealnessScore, 0.0);
    assert.equal(res2.sessionBotRisk, 1.0);
    assert.equal(res2.classification, 'SESSION_HIJACK_RISK');
  } finally {
    _setNativeModuleForTesting(undefined, undefined);
  }
});

test('missing native bridge surfaces NATIVE_BRIDGE_UNAVAILABLE and safe defaults', async () => {
  _setNativeModuleForTesting(null, 'android');
  try {
    await Cynopta.start();
    await Cynopta.stop({ deleteAllData: true });
    assert.equal(await Cynopta.isStarted(), false);
    assert.equal(await Cynopta.isAuthorized(), false);
    assert.equal(await Cynopta.getLicenseResult(), null);
    assert.equal(await Cynopta.getVersionName(), '');
    assert.equal(await Cynopta.getVersionCode(), 0);
    await Cynopta.setReportingEnabled(true);
    assert.equal(await Cynopta.isReportingEnabled(), false);

    const evalAction = await Cynopta.evaluateActionTrust('APP_OPEN');
    assert.equal(evalAction.score, 0.5);
    assert.equal(evalAction.classification, 'PROVISIONAL_NEW_DEVICE');
    assert.deepEqual(evalAction.reasons, ['NATIVE_BRIDGE_UNAVAILABLE']);
    assert.equal(evalAction.actionName, 'APP_OPEN');

    const latest = await Cynopta.getLatestTrustEvaluation();
    assert.deepEqual(latest.reasons, ['NATIVE_BRIDGE_UNAVAILABLE']);
    assert.equal(latest.actionName, 'GET_TRUST_EVALUATION');
  } finally {
    _setNativeModuleForTesting(undefined, undefined);
  }
});

test('unsupported non-mobile platforms no-op cleanly', async () => {
  const calls = [];
  _setNativeModuleForTesting(createMockNative(calls), 'web');
  try {
    await Cynopta.start();
    assert.equal(await Cynopta.isStarted(), false);
    assert.equal(await Cynopta.getLicenseResult(), null);
    const evalWeb = await Cynopta.evaluateActionTrust('LOGIN');
    assert.deepEqual(evalWeb.reasons, []);
    assert.equal(evalWeb.actionName, 'LOGIN');
    assert.equal(calls.length, 0);
  } finally {
    _setNativeModuleForTesting(undefined, undefined);
  }
});
