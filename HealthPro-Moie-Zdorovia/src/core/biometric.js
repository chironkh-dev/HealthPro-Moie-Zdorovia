// Capacitor BiometricAuth wrapper.
// On web / emulator: checkBiometric() returns false, authenticate() returns false.
// Real biometry works only on native Android APK with plugin installed.
// Never throws — all errors are caught internally.
// allowDeviceCredential: false — тільки відбиток/обличчя, НЕ системний PIN.

// Capacitor BiometricAuth wrapper.
// Uses static plugin API — no instantiation needed.

let _plugin = null;

async function _loadPlugin() {
  if (_plugin !== null) return _plugin;
  try {
    const { BiometricAuth } = 
      await import('@aparajita/capacitor-biometric-auth');
    // BiometricAuth — статичний об'єкт, не клас
    _plugin = BiometricAuth;
  } catch {
    _plugin = false;
  }
  return _plugin || null;
}

export async function checkBiometric() {
  try {
    const plugin = await _loadPlugin();
    if (!plugin) return false;
    const info = await plugin.checkBiometry();
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
    });
    return true;
  } catch { return false; }
}