/** Result of offline license verification (`cynopta.json`). */
export interface CynoptaLicenseResult {
  /** Whether the host application is authorized. */
  readonly isAuthorized: boolean;
  /** License verification status (`Authorized`, `MissingAsset`, `Expired`, etc.). */
  readonly status: string;
  /** Verification diagnostic message. */
  readonly reason: string;
}

/** Result of a Cynopta trust evaluation. */
export interface TrustEvaluation {
  /** Combined trust score in `[0.0, 1.0]` (`1.0` = highest trust, `-1.0` if unauthorized). */
  readonly score: number;
  /** Trust classification label (e.g. `VERIFIED_HUMAN`, `PROVISIONAL_NEW_DEVICE`, `SESSION_HIJACK_RISK`). */
  readonly classification: string;
  /** Longitudinal device trust score in `[0.0, 1.0]`. */
  readonly deviceRealnessScore: number;
  /** Session risk probability in `[0.0, 1.0]` (`1.0` = highest risk). */
  readonly sessionBotRisk: number;
  /** Diagnostic reason codes associated with the evaluation. */
  readonly reasons: readonly string[];
  /** Signed backend attestation token suitable for the `X-Cynopta-Attestation` header. */
  readonly attestationPayload: string;
  /** Evaluation wall-clock timestamp in epoch milliseconds. */
  readonly timestamp: number;
  /** Evaluation latency in milliseconds. */
  readonly evaluationLatencyMs: number;
  /** Action label bound to this evaluation (e.g. `USER_LOGIN`, `CHECKOUT_SUBMIT`). */
  readonly actionName: string;
}

export function normalizeLicenseResult(raw: unknown): CynoptaLicenseResult | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const map = raw as Record<string, unknown>;
  return {
    isAuthorized: typeof map.isAuthorized === 'boolean' ? map.isAuthorized : false,
    status: typeof map.status === 'string' && map.status.length > 0 ? map.status : 'Unknown',
    reason: typeof map.reason === 'string' ? map.reason : '',
  };
}

export function normalizeTrustEvaluation(
  raw: unknown,
  defaultActionName = 'ACTION_DEFAULT',
): TrustEvaluation {
  const map = raw != null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawReasons = Array.isArray(map.reasons) ? map.reasons : [];
  return {
    score: typeof map.score === 'number' && Number.isFinite(map.score) ? map.score : 0.5,
    classification:
      typeof map.classification === 'string' && map.classification.length > 0
        ? map.classification
        : 'PROVISIONAL_NEW_DEVICE',
    deviceRealnessScore:
      typeof map.deviceRealnessScore === 'number' && Number.isFinite(map.deviceRealnessScore)
        ? map.deviceRealnessScore
        : 0.5,
    sessionBotRisk:
      typeof map.sessionBotRisk === 'number' && Number.isFinite(map.sessionBotRisk)
        ? map.sessionBotRisk
        : 0.0,
    reasons: Object.freeze(rawReasons.map((item) => String(item))),
    attestationPayload:
      typeof map.attestationPayload === 'string' ? map.attestationPayload : '',
    timestamp:
      typeof map.timestamp === 'number' && Number.isFinite(map.timestamp)
        ? Math.trunc(map.timestamp)
        : 0,
    evaluationLatencyMs:
      typeof map.evaluationLatencyMs === 'number' && Number.isFinite(map.evaluationLatencyMs)
        ? Math.trunc(map.evaluationLatencyMs)
        : 0,
    actionName:
      typeof map.actionName === 'string' && map.actionName.length > 0
        ? map.actionName
        : defaultActionName,
  };
}
