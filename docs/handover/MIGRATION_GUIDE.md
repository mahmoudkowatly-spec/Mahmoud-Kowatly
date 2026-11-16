# Migration Guide — continuing outside Lovable / in Google AI Studio

## Can it run independently? Yes.
The app is plain React + TanStack Start. All logic runs in the browser and the catalog is a static
JSON file. No backend, login or paid API is required.

## Lovable-specific pieces
| Item | Impact | What to do |
|---|---|---|
| `@lovable.dev/vite-tanstack-config` in `vite.config.ts` | Public npm package; bundles tanstackStart, react, tailwind, tsconfig-paths, nitro (Cloudflare target) | Keep it, or replace with an explicit config (below) |
| `src/lib/lovable-error-reporting.ts`, `error-capture.ts` | Sends errors to the Lovable preview only; harmless elsewhere | Optional removal |
| `src/integrations/supabase/*`, `src/start.ts` `attachSupabaseAuth` | Backend client; unused by features. Needs `VITE_SUPABASE_*` vars only if imported at runtime | Keep with your own Supabase project, or remove the files and the middleware line |
| Lovable Cloud database | Empty — nothing to migrate | — |
| Hosting (`*.lovable.app`) | Publishing | Deploy anywhere (below) |

## Replacement vite.config.ts (if dropping the preset)
```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
export default defineConfig({
  server: { port: 8080 },
  plugins: [tsconfigPaths(), tailwindcss(), tanstackStart({ server: { entry: "server" } }), viteReact()],
});
```
Add a nitro/adapter plugin for your host (Node, Vercel, Cloudflare) per TanStack Start docs.

## Google AI Studio
1. Connect the project to GitHub from Lovable (Project settings → Git → GitHub → Connect). Lovable creates a new private repo and pushes all code.
   Alternative: Project settings → Git → Download codebase (ZIP, paid plans).
2. Import that repo/ZIP into Google AI Studio Build mode. AI Studio typically scaffolds its own React/Vite setup; if it cannot run TanStack Start SSR, the app can be ported as a client-only Vite SPA because it uses a single route `/` and no server functions: move `Index` from `src/routes/index.tsx` into a plain `App.tsx`, keep `src/lib/*`, `src/components/ui/*`, `src/styles.css` and `public/data/items.json` unchanged.
3. Point AI Studio at `docs/handover/BUSINESS_LOGIC.md` and tell it not to change those formulas.
4. Run `npx vitest run src/lib/__tests__` after any change to keep the calculation rules intact.

## Manual items
- `.env` with real keys is not in git — recreate from `.env.example` only if you use a backend.
- User projects are in each user's browser; they must use "export JSON" in the old app and "import JSON" in the new one if the domain changes (localStorage is per domain).
- Source price-list Excel files are not in the repo; only the generated `items.json`.
