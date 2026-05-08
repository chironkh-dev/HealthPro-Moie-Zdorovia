#!/usr/bin/env node
/**
 * Скрипт генерації версії HealthPro
 * Зчитує package.json → формує рядки версії з датою збірки та git-хешем
 * Записує у src/core/version.gen.js (автогенерований файл)
 *
 * Формат: MAJOR.MINOR.PATCH(000-999) / DD.MM.YYYY
 * PATCH — автоматично padStart(3, "0")
 * Дата — окремий export APP_DATE у форматі DD.MM.YYYY
 *
 * Використання:
 *   node scripts/gen-version.js
 *   npm run version
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = resolve(__dir, '..');

// ── Зчитуємо package.json ──────────────────────────────────────────────────
const pkgPath = resolve(root, 'package.json');
const pkg     = JSON.parse(readFileSync(pkgPath, 'utf8'));
const semver  = pkg.version || '5.0.0';

// ── Новий формат: MAJOR.MINOR.PATCH(000-999) ─────────────────────────────
const parts  = semver.split('.');
let major    = Number(parts[0] || 0);
let minor    = Number(parts[1] || 0);
let patchNum = Number(parts[2] || 0) + 1;

if (patchNum > 999) { patchNum = 0; minor += 1; }
if (minor > 99)     { minor = 0;    major += 1; }

pkg.version = `${major}.${minor}.${patchNum}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const patchStr         = String(patchNum).padStart(3, '0');
const versionFormatted = `${major}.${minor}.${patchStr}`;

// ── Git-хеш (короткий) ────────────────────────────────────────────────────
let gitHash = '';
try {
  gitHash = execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['pipe','pipe','pipe'] })
    .toString().trim();
} catch { /* не git-репозиторій або git не встановлено */ }

// ── Дата збірки — два формати ────────────────────────────────────────────
const now  = new Date();
const pad  = (n) => String(n).padStart(2, '0');
const dd   = pad(now.getDate());
const mm   = pad(now.getMonth() + 1);
const yyyy = now.getFullYear();
const buildTime    = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
const buildDateISO = `${yyyy}-${mm}-${dd}`;   // ISO (внутрішнє)
const dateStr      = `${dd}.${mm}.${yyyy}`;   // DD.MM.YYYY (відображення)

// ── Формуємо рядки ────────────────────────────────────────────────────────
const buildLabel = `HealthPro v${versionFormatted}` + (gitHash ? ` (${gitHash})` : '');
const buildFull  = `v${versionFormatted} / ${dateStr}`;

// ── Записуємо автогенерований файл ────────────────────────────────────────
const outPath = resolve(root, 'src/core/version.gen.js');
const content = `// АВТОГЕНЕРОВАНИЙ ФАЙЛ — не редагувати вручну
// Генерується командою: npm run version
// Останнє оновлення: ${buildDateISO} ${buildTime}

export const APP_SEMVER      = '${semver}';
export const APP_VERSION     = '${versionFormatted}';        // "5.2.000"
export const APP_DATE        = '${dateStr}';                  // "DD.MM.YYYY"
export const APP_GIT_HASH    = '${gitHash}';
export const APP_BUILD_DATE  = '${buildDateISO}';
export const APP_BUILD_TIME  = '${buildTime}';
export const APP_BUILD_LABEL = '${buildLabel}';
export const APP_BUILD_FULL  = '${buildFull}';               // "v5.2.000 / 08.05.2026"
`;

writeFileSync(outPath, content, 'utf8');

console.log('✅ Версію згенеровано:');
console.log(`   Версія: ${versionFormatted}`);
console.log(`   Дата:   ${dateStr}`);
console.log(`   Мітка:  ${buildLabel}`);
console.log(`   Повна:  ${buildFull}`);
console.log(`   Файл:   src/core/version.gen.js`);
