# Database & Backend

## Current state (verified)
- Backend: Lovable Cloud (managed Supabase / PostgreSQL). Enabled, but **empty**:
  no tables, views, functions, triggers, enums, RLS policies, storage buckets, edge functions,
  or auth users are defined or used. `src/integrations/supabase/types.ts` lists no tables and
  `supabase/migrations/` does not exist.
- Authentication: none. No user roles.
- Server functions / API routes: none (only the SSR error wrapper in `src/server.ts`).

## Where data actually lives
| Data | Location | Shape |
|---|---|---|
| Price catalog (5,622 rows) | `public/data/items.json` (static file) | see BUSINESS_LOGIC §1 |
| Projects & estimates | browser `localStorage` key `gea_projects_v2` | `{ projects: Project[], activeId: string }` |
| Legacy single estimate | `localStorage` key `gea_estimate_v1` | migrated on first load |

### Project
| Field | Type | Notes |
|---|---|---|
| id | string | `p<timestamp><rand>` |
| updatedAt | number | epoch ms |
| projectName, clientName, orgName, governorate, refNumber | string | |
| discountPercent | number | percent, e.g. 5 = 5% |
| logoDataUrl | string | base64 data URL |
| estimate | LineItem[] | |

### LineItem
Catalog item fields (`id, code, desc, unit, rate, part, page, section`) + `qty: number`, optional `custom: boolean`.

## Optional future schema
`DATABASE_MIGRATIONS/0001_optional_projects_schema.sql` is a **proposal, not applied**, mirroring the
localStorage model if you want cloud persistence later. Data is not migrated automatically; users
can move projects via the app's JSON export/import.
