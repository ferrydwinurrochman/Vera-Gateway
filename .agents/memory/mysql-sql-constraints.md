---
name: MySQL-only SQL constraints
description: Raw sql`` templates in drizzle-orm must use MySQL syntax, not PostgreSQL.
---

## Rule
All raw `sql<T>\`...\`` template literals must use MySQL-compatible syntax.

## Forbidden PG-isms and MySQL replacements
| PostgreSQL | MySQL |
|---|---|
| `count(*)::int` | `cast(count(*) as unsigned)` |
| `coalesce(sum(...), 0)::int` | `cast(coalesce(sum(...), 0) as unsigned)` |
| `ilike(col, '%x%')` | `like(col, '%x%')` (MySQL LIKE is case-insensitive by default with utf8mb4) |
| `sql\`col = ANY(${arr})\`` | `inArray(col, arr)` from drizzle-orm |

## Important
- The TypeScript generic `sql<number>` is just a type hint; at runtime MySQL returns bigint/string for COUNT. Use `sql<string>` and wrap results with `Number()` in JS to avoid silent NaN.
- `inArray(col, [])` (empty array) will throw or produce invalid SQL — always guard with `merchantIds.length > 0` before calling.

**Why:** The DB is MySQL 8 on a remote host. Drizzle passes raw sql`` content verbatim; PostgreSQL cast syntax causes `ER_PARSE_ERROR` at runtime.

**How to apply:** Any time you write a new aggregate query (COUNT, SUM, etc.) or a search filter in this codebase.
