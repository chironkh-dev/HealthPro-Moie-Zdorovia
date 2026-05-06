#!/usr/bin/env node
/**
 * Скрипт генерації версії HealthPro
 * Зчитує package.json → формує рядок версії з датою збірки та git-хешем
 * Записує у src/core/version.gen.js (автогенерований файл)
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
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const semver = pkg.version || '5.0.0';

// ── Git-хеш (короткий) ────────────────────────────────────────────────────
let gitHash = '';
try {
  gitHash = execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['pipe','pipe','pipe'] })
    .toString().trim();
} catch { /* не git-репозиторій або git не встановлено */ }

// ── Дата збірки ───────────────────────────────────────────────────────────
const now    = new Date();
const pad    = (n) => String(n).padStart(2, '0');
const buildDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
const buildTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

// ── Формуємо рядки ────────────────────────────────────────────────────────
const buildLabel = `HealthPro v${semver}` + (gitHash ? ` (${gitHash})` : '');
const buildFull  = `v${semver} · ${buildDate} ${buildTime}` + (gitHash ? ` · ${gitHash}` : '');

// ── Записуємо автогенерований файл ────────────────────────────────────────
const outPath = resolve(root, 'src/core/version.gen.js');
const content = `// АВТОГЕНЕРОВАНИЙ ФАЙЛ — не редагувати вручну
// Генерується командою: npm run version
// Останнє оновлення: ${buildDate} ${buildTime}

export const APP_SEMVER      = '${semver}';
export const APP_GIT_HASH    = '${gitHash}';
export const APP_BUILD_DATE  = '${buildDate}';
export const APP_BUILD_TIME  = '${buildTime}';
export const APP_BUILD_LABEL = '${buildLabel}';
export const APP_BUILD_FULL  = '${buildFull}';
`;

writeFileSync(outPath, content, 'utf8');

console.log('✅ Версію згенеровано:');
console.log(`   Мітка:  ${buildLabel}`);
console.log(`   Повна:  ${buildFull}`);
console.log(`   Файл:   src/core/version.gen.js`);
