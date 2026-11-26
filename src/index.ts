import {
  CynoptaNativeModule,
  getNativeCynoptaModule,
  getPlatformOs,
  isSupportedMobilePlatform,
  _setNativeModuleForTesting,
} from './NativeCynopta';
import {
  CynoptaLicenseResult,
  TrustEvaluation,
  normalizeLicenseResult,
  normalizeTrustEvaluation,
} from './types';

export type { CynoptaLicenseResult, TrustEvaluation } from './types';
export { _setNativeModuleForTesting };

function unavailableEvaluation(
  actionName: string,
  includeUnavailableReason: boolean,
): TrustEvaluation {
  return {
    score: 0.5,
    classification: 'PROVISIONAL_NEW_DEVICE',
    deviceRealnessScore: 0.5,
    sessionBotRisk: 0.0,
    reasons: Object.freeze(includeUnavailableReason ? ['NATIVE_BRIDGE_UNAVAILABLE'] : []),
    attestationPayload: '',
    timestamp: 0,
    evaluationLatencyMs: 0,
    actionName,
  };
}

function failClosedEvaluation(
  reasons: readonly string[],
  attestationPayload: string,
  timestamp: number,
  evaluationLatencyMs: number,
  actionName: string,
): TrustEvaluation {
  return {
    score: 0.0,
    classification: 'SESSION_HIJACK_RISK',
    deviceRealnessScore: 0.0,
    sessionBotRisk: 1.0,
    reasons,
    attestationPayload,
    timestamp,
    evaluationLatencyMs,
    actionName,
  };
}

function nextNonceHex(): string {
  let hi = 0;
  let lo = 0;
  const gCrypto = (
    globalThis as { crypto?: { getRandomValues?: (arr: Uint32Array) => Uint32Array } }
  )?.crypto;
  if (gCrypto && typeof gCrypto.getRandomValues === 'function') {
    const arr = new Uint32Array(2);
    gCrypto.getRandomValues(arr);
    hi = arr[0] >>> 0;
    lo = arr[1] >>> 0;
  } else {
    hi = (Math.random() * 0x100000000) >>> 0;
    lo = (Math.random() * 0x100000000) >>> 0;
  }
  if (hi === 0 && lo === 0) {
    lo = 1;
  }
  return hi.toString(16).padStart(8, '0') + lo.toString(16).padStart(8, '0');
}

function decodeUnits(raw: number): number {
  return raw === 0xffff ? -1.0 : raw / 10000;
}

function decodeClassification(code: number, fallback: string): string {
  switch (code) {
    case 1:
      return 'VERIFIED_HUMAN';
    case 2:
      return 'PROVISIONAL_NEW_DEVICE';
    case 3:
      return 'SUSPICIOUS_SESSION';
    case 4:
      return 'SUSPICIOUS_PROVISIONAL';
    case 5:
      return 'SESSION_HIJACK_RISK';
    case 6:
      return 'SYNTHETIC_BOT_FARM';
    case 7:
      return 'UNAUTHORIZED_LICENSE';
    case 8:
      return 'LEASE_SUSPENDED';
    case 9:
      return 'LEASE_NOT_COVERED';
    case 10:
      return 'LEASE_QUOTA_REACHED';
    default:
      return fallback;
  }
}

async function decodeSealedResponse(
  mod: CynoptaNativeModule,
  raw: Record<string, unknown> | null,
  nonceHex: string,
  defaultActionName: string,
): Promise<TrustEvaluation> {
  const safeMap = raw != null && typeof raw === 'object' ? raw : {};
  const rawReasons = Array.isArray(safeMap.reasons) ? safeMap.reasons : [];
  const reasons = Object.freeze(rawReasons.map((item) => String(item)));
  const actionName =
    typeof safeMap.actionName === 'string' && safeMap.actionName.length > 0
      ? safeMap.actionName
      : defaultActionName;
  const attestationPayload =
    typeof safeMap.attestationPayload === 'string' ? safeMap.attestationPayload : '';
  const timestamp =
    typeof safeMap.timestamp === 'number' && Number.isFinite(safeMap.timestamp)
      ? Math.trunc(safeMap.timestamp)
      : 0;
  const evaluationLatencyMs =
    typeof safeMap.evaluationLatencyMs === 'number' && Number.isFinite(safeMap.evaluationLatencyMs)
      ? Math.trunc(safeMap.evaluationLatencyMs)
      : 0;

  if (getPlatformOs() === 'android') {
    const sealed = safeMap.d;
    if (typeof sealed !== 'string' || sealed.length === 0 || typeof mod.unsealPacket !== 'function') {
      return failClosedEvaluation(
        reasons,
        attestationPayload,
        timestamp,
        evaluationLatencyMs,
        actionName,
      );
    }

    let packedHex: string;
    try {
      packedHex = (await mod.unsealPacket(nonceHex, sealed)).trim();
    } catch {
      return failClosedEvaluation(
        reasons,
        attestationPayload,
        timestamp,
        evaluationLatencyMs,
        actionName,
      );
    }

    if (!/^[0-9a-fA-F]{1,16}$/.test(packedHex)) {
      return failClosedEvaluation(
        reasons,
        attestationPayload,
        timestamp,
        evaluationLatencyMs,
        actionName,
      );
    }

    const r = BigInt('0x' + packedHex);
    if (r === 0n) {
      return failClosedEvaluation(
        reasons,
        attestationPayload,
        timestamp,
        evaluationLatencyMs,
        actionName,
      );
    }

    const fallback =
      typeof safeMap.c === 'string' && safeMap.c.length > 0
        ? safeMap.c
        : 'PROVISIONAL_NEW_DEVICE';

    return {
      score: decodeUnits(Number(r & 0xffffn)),
      classification: decodeClassification(Number((r >> 48n) & 0xffn), fallback),
      deviceRealnessScore: decodeUnits(Number((r >> 16n) & 0xffffn)),
      sessionBotRisk: decodeUnits(Number((r >> 32n) & 0xffffn)),
      reasons,
      attestationPayload,
      timestamp,
      evaluationLatencyMs,
      actionName,
    };
  }

  return normalizeTrustEvaluation({ ...safeMap, actionName }, defaultActionName);
}

/** Top-level React Native facade for the Cynopta SDK (Android & iOS). */
export const Cynopta = {
  /** Starts or resumes SDK collection. */
  async start(): Promise<void> {
    if (!isSupportedMobilePlatform()) return;
    const mod = getNativeCynoptaModule();
    if (!mod) return;
    await mod.start();
  },

  /** Stops SDK collection and optionally deletes persisted local state. */
  async stop(options?: { deleteAllData?: boolean }): Promise<void> {
    if (!isSupportedMobilePlatform()) return;
    const mod = getNativeCynoptaModule();
    if (!mod) return;
    await mod.stop(options?.deleteAllData ?? false);
  },

  /** Returns `true` if the Cynopta SDK is active and running. */
  async isStarted(): Promise<boolean> {
    if (!isSupportedMobilePlatform()) return false;
    const mod = getNativeCynoptaModule();
    if (!mod) return false;
    return Boolean(await mod.isStarted());
  },

  /** Returns `true` if the application passed license verification. */
  async isAuthorized(): Promise<boolean> {
    if (!isSupportedMobilePlatform()) return false;
    const mod = getNativeCynoptaModule();
    if (!mod) return false;
    return Boolean(await mod.isAuthorized());
  },

  /** Returns the offline license verification result. */
  async getLicenseResult(): Promise<CynoptaLicenseResult | null> {
    if (!isSupportedMobilePlatform()) return null;
    const mod = getNativeCynoptaModule();
    if (!mod) return null;
    return normalizeLicenseResult(await mod.getLicenseResult());
  },

  /** Returns the native Cynopta SDK version string (e.g. `"1.0.28"`). */
  async getVersionName(): Promise<string> {
    if (!isSupportedMobilePlatform()) return '';
    const mod = getNativeCynoptaModule();
    if (!mod) return '';
    return (await mod.getVersionName()) ?? '';
  },

  /** Returns the native Cynopta SDK version code. */
  async getVersionCode(): Promise<number> {
    if (!isSupportedMobilePlatform()) return 0;
    const mod = getNativeCynoptaModule();
    if (!mod) return 0;
    return (await mod.getVersionCode()) ?? 0;
  },

  /** Enables or disables periodic telemetry reporting. */
  async setReportingEnabled(enabled: boolean): Promise<void> {
    if (!isSupportedMobilePlatform()) return;
    const mod = getNativeCynoptaModule();
    if (!mod) return;
    await mod.setReportingEnabled(enabled);
  },

  /** Returns `true` if periodic telemetry reporting is currently enabled. */
  async isReportingEnabled(): Promise<boolean> {
    if (!isSupportedMobilePlatform()) return false;
    const mod = getNativeCynoptaModule();
    if (!mod) return false;
    return Boolean(await mod.isReportingEnabled());
  },

  /** Performs a trust evaluation bound to `actionName`. */
  async evaluateActionTrust(actionName = 'ACTION_DEFAULT'): Promise<TrustEvaluation> {
    if (!isSupportedMobilePlatform()) {
      return unavailableEvaluation(actionName, false);
    }
    const mod = getNativeCynoptaModule();
    if (!mod) {
      return unavailableEvaluation(actionName, true);
    }
    const nonceHex = nextNonceHex();
    const raw = await mod.evaluateActionTrust(actionName, nonceHex);
    return decodeSealedResponse(mod, raw, nonceHex, actionName);
  },

  /** Returns the most recent cached evaluation, or triggers a new evaluation. */
  async getLatestTrustEvaluation(): Promise<TrustEvaluation> {
    if (!isSupportedMobilePlatform()) {
      return unavailableEvaluation('GET_TRUST_EVALUATION', false);
    }
    const mod = getNativeCynoptaModule();
    if (!mod) {
      return unavailableEvaluation('GET_TRUST_EVALUATION', true);
    }
    const nonceHex = nextNonceHex();
    const raw = await mod.getLatestTrustEvaluation(nonceHex);
    return decodeSealedResponse(mod, raw, nonceHex, 'GET_TRUST_EVALUATION');
  },
} as const;

export default Cynopta;
