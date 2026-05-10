// Capacitor BiometricAuth wrapper.
// On web / emulator: checkBiometric() returns false, authenticate() returns false.
// Real biometry works only on native Android APK with plugin installed.
// Never throws — all errors are caught internally.
// allowDeviceCredential: false — тільки відбиток/обличчя, НЕ системний PIN.

// @capgo/capacitor-native-biometric wrapper

import { NativeBiometric } from '@capgo/capacitor-native-biometric';

export async function checkBiometric() {
  try {
    const result = await NativeBiometric.isAvailable();
    return !!(result?.isAvailable);
  } catch { return false; }
}

export async function authenticate() {
  try {
    await NativeBiometric.verifyIdentity({
      reason: 'Підтвердіть особу для доступу до HealthPro',
      title: 'HealthPro',
      cancelButtonTitle: 'Використати PIN',
      maxAttempts: 3,
    });
    return true;
  } catch { return false; }
}