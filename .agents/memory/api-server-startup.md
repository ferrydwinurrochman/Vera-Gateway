---
name: API server startup quirks
description: Runtime fixes needed to get the api-server and vera-gate dev workflows running.
---

## mysql2 must be bundled

`mysql2` was listed in the `external` array in `artifacts/api-server/build.mjs`. Because the monorepo's `node_modules` lives at the workspace root (not inside `artifacts/api-server/`), the externalized import fails at runtime with `ERR_MODULE_NOT_FOUND`. Fix: remove `mysql2` from the externals list so esbuild bundles it directly into `dist/index.mjs`.

**Why:** pnpm hoists packages to the workspace root; externalized packages are only resolvable if they exist in the artifact's own `node_modules`, which they don't in this setup.

**How to apply:** Any time a package is externalized in `build.mjs` and fails with `ERR_MODULE_NOT_FOUND` at runtime, remove it from the `external` array unless it has a specific native-binding reason to be external.

## PORT and BASE_PATH in dev workflow commands

- `api-server` requires `PORT` env var at startup (throws if missing). The dev script doesn't set it. Workflow command must be: `PORT=8080 pnpm --filter @workspace/api-server run dev`
- `vera-gate` (Vite) requires `BASE_PATH` env var in `vite.config.ts`. Workflow command must be: `PORT=22415 BASE_PATH=/ pnpm --filter @workspace/vera-gate run dev`

**Why:** The artifact.toml sets these only for production; the dev workflow command must supply them explicitly.
