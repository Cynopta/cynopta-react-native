declare const require: ((id: string) => unknown) | undefined;

export interface CynoptaNativeModule {
  start(): Promise<void>;
  stop(deleteAllData: boolean): Promise<void>;
  isStarted(): Promise<boolean>;
  isAuthorized(): Promise<boolean>;
  getLicenseResult(): Promise<Record<string, unknown> | null>;
  getVersionName(): Promise<string>;
  getVersionCode(): Promise<number>;
  setReportingEnabled(enabled: boolean): Promise<void>;
  isReportingEnabled(): Promise<boolean>;
  evaluateActionTrust(
    actionName: string,
    nonceHex: string,
  ): Promise<Record<string, unknown> | null>;
  getLatestTrustEvaluation(
    nonceHex: string,
  ): Promise<Record<string, unknown> | null>;
  unsealPacket(nonceHex: string, sealedBase64: string): Promise<string>;
}

interface ReactNativeRuntimeShape {
  Platform?: { OS?: string };
  TurboModuleRegistry?: { get?: (name: string) => unknown };
  NativeModules?: Record<string, unknown>;
}

const UNSET_OVERRIDE = Symbol('unset');
let testNativeModuleOverride: CynoptaNativeModule | null | typeof UNSET_OVERRIDE = UNSET_OVERRIDE;
let testPlatformOsOverride: string | null | typeof UNSET_OVERRIDE = UNSET_OVERRIDE;

function loadReactNativeRuntime(): ReactNativeRuntimeShape | null {
  try {
    if (typeof require === 'function') {
      const mod = require('react-native');
      if (mod != null && typeof mod === 'object') {
        return mod as ReactNativeRuntimeShape;
      }
    }
  } catch {
    // Running outside React Native runtime (e.g. Node unit tests).
  }
  return null;
}

export function getPlatformOs(): string {
  if (testPlatformOsOverride !== UNSET_OVERRIDE) {
    return typeof testPlatformOsOverride === 'string' ? testPlatformOsOverride : 'unknown';
  }
  const rn = loadReactNativeRuntime();
  return typeof rn?.Platform?.OS === 'string' ? rn.Platform.OS : 'unknown';
}

export function isSupportedMobilePlatform(): boolean {
  const os = getPlatformOs();
  if (os === 'unknown') {
    return true;
  }
  return os === 'android' || os === 'ios';
}

export function getNativeCynoptaModule(): CynoptaNativeModule | null {
  if (testNativeModuleOverride !== UNSET_OVERRIDE) {
    return testNativeModuleOverride;
  }
  if (!isSupportedMobilePlatform()) {
    return null;
  }
  const rn = loadReactNativeRuntime();
  if (!rn) {
    return null;
  }
  const fromTurbo = rn.TurboModuleRegistry?.get?.('Cynopta');
  if (fromTurbo != null && typeof fromTurbo === 'object') {
    return fromTurbo as CynoptaNativeModule;
  }
  const fromLegacy = rn.NativeModules?.Cynopta;
  if (fromLegacy != null && typeof fromLegacy === 'object') {
    return fromLegacy as CynoptaNativeModule;
  }
  return null;
}

/** @internal Testing helper for injecting or clearing a mock native bridge. */
export function _setNativeModuleForTesting(
  module: CynoptaNativeModule | null | undefined,
  platformOs?: string | null,
): void {
  testNativeModuleOverride = module === undefined ? UNSET_OVERRIDE : module;
  testPlatformOsOverride = platformOs === undefined ? UNSET_OVERRIDE : platformOs;
}
