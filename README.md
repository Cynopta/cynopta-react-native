# @cynopta/react-native

React Native plugin for the **Cynopta SDK**.

Automatically bundles the native Cynopta SDK (`com.github.Cynopta:android-sdk-dist`) and packages your root `cynopta.json` license file — **zero native Kotlin/Java or Gradle edits required**.

## Setup (2 Steps)

### 1. Install the Plugin
```bash
npm install https://github.com/Cynopta/cynopta-react-native.git#v1.0.28
```
Or in `package.json`:
```json
{
  "dependencies": {
    "@cynopta/react-native": "https://github.com/Cynopta/cynopta-react-native.git#v1.0.28"
  }
}
```

### 2. Place `cynopta.json` in Your React Native Project Root
Place the `cynopta.json` file provided by Cynopta in the **root of your React Native project** (right next to `package.json`):

```text
your_rn_app/
├── package.json
├── cynopta.json      <-- Place here (auto-bundled at Android build time)
└── App.tsx
```

---

## Usage in TypeScript / JavaScript
```ts
import { Cynopta } from '@cynopta/react-native';

async function verifyCheckout() {
  const evalResult = await Cynopta.evaluateActionTrust('CHECKOUT_SUBMIT');
  if (evalResult.score < 0.35) {
    // Trigger MFA or block request
  } else {
    // Forward evalResult.attestationPayload in the X-Cynopta-Attestation header
  }
}

// Optional: toggle periodic telemetry reporting at runtime
await Cynopta.setReportingEnabled(true);
const isReporting = await Cynopta.isReportingEnabled();
```
