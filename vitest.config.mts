import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

// Plain Node, no Expo preset: only pure metric code is tested, so nothing may import native modules.
// Aliases mirror tsconfig paths; `@types` is exact-match so npm `@types/*` packages still resolve.
const alias = [
    { find: /^@types$/, replacement: src('types/index.ts') },
    { find: /^@utils\/(.*)$/, replacement: src('utils/$1') },
    { find: /^@constants\/(.*)$/, replacement: src('constants/$1') },
];

// Every test runs once per time zone: month boundaries are computed in local time.
const zone = (name: string, TZ: string) => ({
    resolve: { alias },
    test: { name, include: ['src/**/*.test.ts'], environment: 'node' as const, env: { TZ } },
});

export default defineConfig({
    test: {
        projects: [zone('manila', 'Asia/Manila'), zone('los-angeles', 'America/Los_Angeles')],
    },
});
