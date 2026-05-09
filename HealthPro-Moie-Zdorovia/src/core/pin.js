// Autonomous 4-digit PIN lock — no external plugins needed.
// PIN stored as SHA-256(salt+pin) in localStorage.
// Works identically on web and Android APK.

const PIN_KEY  = 'hp_pin_hash';
const PIN_SALT = 'hp_pin_v1:';

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function isPINSet() {
  try { return !!localStorage.getItem(PIN_KEY); } catch { return false; }
}

export async function setPIN(pin) {
  const hash = await sha256hex(PIN_SALT + pin);
  try { localStorage.setItem(PIN_KEY, hash); } catch {}
}

export async function verifyPIN(pin) {
  try {
    const stored = localStorage.getItem(PIN_KEY);
    if (!stored) return false;
    const hash = await sha256hex(PIN_SALT + pin);
    return hash === stored;
  } catch { return false; }
}

export function clearPIN() {
  try { localStorage.removeItem(PIN_KEY); } catch {}
}
