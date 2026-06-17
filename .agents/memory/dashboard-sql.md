---
name: Dashboard SQL inArray fix
description: drizzle-orm ANY() syntax pitfall in dashboard summary route
---

The dashboard summary route needs to look up merchant names by a list of IDs.

**Rule:** Never use raw `sql\`${col} = ANY(${array})\`` with a JS array — drizzle serializes arrays incorrectly for PostgreSQL. Always use `inArray(col, array)` from drizzle-orm.

**Why:** Raw `ANY(($1, $2))` is invalid SQL. Drizzle's `inArray()` generates correct `WHERE id = ANY(ARRAY[$1,$2])` or `WHERE id IN ($1, $2)`.

**How to apply:** In any route that filters by a JS array of IDs, import and use `inArray` from drizzle-orm.
