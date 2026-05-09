// Capacitor BiometricAuth wrapper.
// On web / emulator: checkBiometric() returns false, authenticate() returns false.
// Real biometry works only on native Android APK with plugin installed.
// Never throws — all errors are caught internally.
// allowDeviceCredential: false — тільки відбиток/обличчя, НЕ системний PIN.

let _BiometricAuth = null;

async function _loadPlugin() {
  if (_BiometricAuth !== null) return _BiometricAuth;
  try {
    const m = await import('@aparajita/capacitor-biometric-auth');
    _BiometricAuth = m.BiometricAuth ?? null;
  } catch {
    _BiometricAuth = false;
  }
  return _BiometricAuth || null;
}

export async function checkBiometric() {
  try {
    const plugin = await _loadPlugin();
    if (!plugin) return false;
    const info = await plugin.checkBiometry();
    // Тільки відбиток/обличчя — НЕ системний PIN (deviceIsSecure)
    return !!(info?.isAvailable);
  } catch { return false; }
}

export async function authenticate() {
  try {
    const plugin = await _loadPlugin();
    if (!plugin) return false;
    await plugin.authenticate({
      reason: 'Підтвердіть особу для доступу до HealthPro',
      cancelTitle: 'Використати PIN',
      allowDeviceCredential: false,
      iosFallbackTitle: 'Використати PIN',
    });
    return true;
  } catch {
    return false; // скасування або помилка → fallback на PIN-пад у app.js
  }
}
