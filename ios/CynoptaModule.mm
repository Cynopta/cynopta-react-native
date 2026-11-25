#import "CynoptaModule.h"

@implementation CynoptaModule

RCT_EXPORT_MODULE(Cynopta)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

RCT_EXPORT_METHOD(start:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(nil);
}

RCT_EXPORT_METHOD(stop:(BOOL)deleteAllData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(nil);
}

RCT_EXPORT_METHOD(isStarted:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(@NO);
}

RCT_EXPORT_METHOD(isAuthorized:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(@NO);
}

RCT_EXPORT_METHOD(getLicenseResult:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(nil);
}

RCT_EXPORT_METHOD(getVersionName:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(@"");
}

RCT_EXPORT_METHOD(getVersionCode:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(@0);
}

RCT_EXPORT_METHOD(setReportingEnabled:(BOOL)enabled
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(nil);
}

RCT_EXPORT_METHOD(isReportingEnabled:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(@NO);
}

RCT_EXPORT_METHOD(evaluateActionTrust:(NSString *)actionName
                  nonce:(NSString *)nonceHex
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSString *action = (actionName.length > 0) ? actionName : @"ACTION_DEFAULT";
  resolve(@{
    @"score" : @0.5,
    @"classification" : @"PROVISIONAL_NEW_DEVICE",
    @"deviceRealnessScore" : @0.5,
    @"sessionBotRisk" : @0.0,
    @"reasons" : @[ @"NATIVE_BRIDGE_UNAVAILABLE" ],
    @"attestationPayload" : @"",
    @"timestamp" : @0,
    @"evaluationLatencyMs" : @0,
    @"actionName" : action,
  });
}

RCT_EXPORT_METHOD(getLatestTrustEvaluation:(NSString *)nonceHex
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(@{
    @"score" : @0.5,
    @"classification" : @"PROVISIONAL_NEW_DEVICE",
    @"deviceRealnessScore" : @0.5,
    @"sessionBotRisk" : @0.0,
    @"reasons" : @[ @"NATIVE_BRIDGE_UNAVAILABLE" ],
    @"attestationPayload" : @"",
    @"timestamp" : @0,
    @"evaluationLatencyMs" : @0,
    @"actionName" : @"GET_TRUST_EVALUATION",
  });
}

RCT_EXPORT_METHOD(unsealPacket:(NSString *)nonceHex
                  sealedBase64:(NSString *)sealedBase64
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(@"0");
}

@end
