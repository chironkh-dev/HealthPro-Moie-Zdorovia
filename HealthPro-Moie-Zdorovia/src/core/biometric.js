// Capacitor BiometricAuth wrapper.
// On web / emulator: checkBiometric() returns false, authenticate() returns false.
// Real biometry works only on native Android APK with plugin installed.
// Never throws — all errors are caught internally.
// allowDeviceCredential: false — тільки відбиток/обличчя, НЕ системний PIN.

// @capgo/capacitor-native-biometric wrapper -- log

import { NativeBiometric } from '@capgo/capacitor-native-biometric';

export async function checkBiometric() {
  try {
    const result = await NativeBiometric.isAvailable();
    console.log('[BIO] isAvailable:', JSON.stringify(result));
    return !!(result?.isAvailable);
  } catch(e) { 
    console.log('[BIO] error:', e?.message, e?.code);
    return false; 
  }
}

export async function authenticate() {
  try {
    const result = await NativeBiometric.verifyIdentity({
      reason: 'Підтвердіть особу для доступу до HealthPro',
      title: 'HealthPro',
      subtitle: 'Біометричний вхід',
      description: 'Використайте відбиток або обличчя',
      useFallback: false,
    });

    const ok = result === undefined
      || result === true
      || result?.verified === true
      || result?.success === true;

    console.log('[BIO] authenticate result:', JSON.stringify(result), 'ok=', ok);
    return ok;
  } catch(e) {
    console.log('[BIO] authenticate error:', e?.message, e?.code);
    return false;
  }
}
