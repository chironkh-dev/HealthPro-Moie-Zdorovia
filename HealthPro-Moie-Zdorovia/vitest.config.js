import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        // Замінює src/core/charts.js стабом для ВСІХ тестів.
        // Regex матчить проти абсолютного resolved-шляху (поведінка Vite).
        // zrender звертається до navigator при завантаженні модуля → краш
        // на Node < 22. Стаб усуває залежність від browser-globals у тестах.
        find: /\/src\/core\/charts\.js$/,
        replacement: resolve(__dirname, 'tests/mocks/charts.js'),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['./tests/setup.js'],
    globals: false,
  },
});
