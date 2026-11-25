package com.cynopta.reactnative;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cynopta.sdk.CynoptaReactNativeBridge;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Minimal React Native native module delegating to {@link CynoptaReactNativeBridge}.
 */
@ReactModule(name = CynoptaModule.NAME)
public class CynoptaModule extends ReactContextBaseJavaModule {

    public static final String NAME = "Cynopta";

    public CynoptaModule(@NonNull ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return NAME;
    }

    private Context getAppContext() {
        Context appContext = getReactApplicationContext().getApplicationContext();
        return appContext != null ? appContext : getReactApplicationContext();
    }

    @ReactMethod
    public void start(Promise promise) {
        try {
            CynoptaReactNativeBridge.start(getAppContext());
            promise.resolve(null);
        } catch (Throwable t) {
            promise.reject("CYNOPTA_START_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void stop(boolean deleteAllData, Promise promise) {
        try {
            CynoptaReactNativeBridge.stop(getAppContext(), deleteAllData);
            promise.resolve(null);
        } catch (Throwable t) {
            promise.reject("CYNOPTA_STOP_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void isStarted(Promise promise) {
        try {
            promise.resolve(CynoptaReactNativeBridge.isStarted());
        } catch (Throwable t) {
            promise.reject("CYNOPTA_STATUS_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void isAuthorized(Promise promise) {
        try {
            promise.resolve(CynoptaReactNativeBridge.isAuthorized());
        } catch (Throwable t) {
            promise.reject("CYNOPTA_AUTH_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void getLicenseResult(Promise promise) {
        try {
            Map<String, ?> result = CynoptaReactNativeBridge.getLicenseResultMap();
            if (result == null) {
                promise.resolve(null);
                return;
            }
            WritableMap map = Arguments.createMap();
            Object isAuth = result.get("isAuthorized");
            map.putBoolean("isAuthorized", isAuth instanceof Boolean ? (Boolean) isAuth : false);
            map.putString("status", result.get("status") instanceof String ? (String) result.get("status") : "Unknown");
            map.putString("reason", result.get("reason") instanceof String ? (String) result.get("reason") : "");
            promise.resolve(map);
        } catch (Throwable t) {
            promise.reject("CYNOPTA_LICENSE_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void getVersionName(Promise promise) {
        try {
            promise.resolve(CynoptaReactNativeBridge.getVersionName());
        } catch (Throwable t) {
            promise.reject("CYNOPTA_VERSION_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void getVersionCode(Promise promise) {
        try {
            promise.resolve(CynoptaReactNativeBridge.getVersionCode());
        } catch (Throwable t) {
            promise.reject("CYNOPTA_VERSION_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void setReportingEnabled(boolean enabled, Promise promise) {
        try {
            CynoptaReactNativeBridge.setReportingEnabled(getAppContext(), enabled);
            promise.resolve(null);
        } catch (Throwable t) {
            promise.reject("CYNOPTA_REPORTING_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void isReportingEnabled(Promise promise) {
        try {
            promise.resolve(CynoptaReactNativeBridge.isReportingEnabled(getAppContext()));
        } catch (Throwable t) {
            promise.reject("CYNOPTA_REPORTING_ERROR", t.getMessage(), t);
        }
    }

    @ReactMethod
    public void evaluateActionTrust(@Nullable String actionName, @Nullable String nonceHex, Promise promise) {
        AtomicBoolean settled = new AtomicBoolean(false);
        try {
            CynoptaReactNativeBridge.evaluateActionTrust(
                    getAppContext(),
                    actionName,
                    nonceHex,
                    createBridgeCallback(settled, promise)
            );
        } catch (Throwable t) {
            if (settled.compareAndSet(false, true)) {
                promise.reject("CYNOPTA_EVAL_ERROR", t.getMessage(), t);
            }
        }
    }

    @ReactMethod
    public void getLatestTrustEvaluation(@Nullable String nonceHex, Promise promise) {
        AtomicBoolean settled = new AtomicBoolean(false);
        try {
            CynoptaReactNativeBridge.getLatestTrustEvaluation(
                    getAppContext(),
                    nonceHex,
                    createBridgeCallback(settled, promise)
            );
        } catch (Throwable t) {
            if (settled.compareAndSet(false, true)) {
                promise.reject("CYNOPTA_EVAL_ERROR", t.getMessage(), t);
            }
        }
    }

    @ReactMethod
    public void unsealPacket(@Nullable String nonceHex, @Nullable String sealedBase64, Promise promise) {
        try {
            promise.resolve(CynoptaReactNativeBridge.unsealPacket(nonceHex, sealedBase64));
        } catch (Throwable t) {
            promise.resolve("0");
        }
    }

    private static CynoptaReactNativeBridge.BridgeCallback createBridgeCallback(
            final AtomicBoolean settled,
            final Promise promise
    ) {
        return new CynoptaReactNativeBridge.BridgeCallback() {
            @Override
            public void onResult(@NonNull Map<String, ?> result) {
                if (settled.compareAndSet(false, true)) {
                    promise.resolve(toSealedWritableMap(result));
                }
            }

            @Override
            public void onError(@NonNull Throwable error) {
                if (settled.compareAndSet(false, true)) {
                    promise.reject("CYNOPTA_EVAL_ERROR", error.getMessage(), error);
                }
            }
        };
    }

    private static WritableMap toSealedWritableMap(@NonNull Map<String, ?> src) {
        WritableMap map = Arguments.createMap();
        map.putString("d", src.get("d") instanceof String ? (String) src.get("d") : "");
        map.putString("c", src.get("c") instanceof String ? (String) src.get("c") : "SESSION_HIJACK_RISK");

        WritableArray reasons = Arguments.createArray();
        Object rawReasons = src.get("reasons");
        if (rawReasons instanceof List<?>) {
            for (Object item : (List<?>) rawReasons) {
                if (item != null) {
                    reasons.pushString(item.toString());
                }
            }
        }
        map.putArray("reasons", reasons);

        Object att = src.get("attestationPayload");
        map.putString("attestationPayload", att instanceof String ? (String) att : "");

        Object ts = src.get("timestamp");
        map.putDouble("timestamp", ts instanceof Number ? ((Number) ts).doubleValue() : 0.0);

        Object lat = src.get("evaluationLatencyMs");
        map.putDouble("evaluationLatencyMs", lat instanceof Number ? ((Number) lat).doubleValue() : 0.0);

        Object act = src.get("actionName");
        map.putString("actionName", act instanceof String ? (String) act : "ACTION_DEFAULT");
        return map;
    }
}
