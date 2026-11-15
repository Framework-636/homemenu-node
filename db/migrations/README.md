# Database migrations

Schema changes after the baseline in `db/init/`. Run with `npm run migrate`.

- One change per file, named `NNNN_short_description.sql` (e.g. `0003_add_cook_log.sql`)
- Files run once, in name order; applied ones are recorded in `schema_migrations`
- Never edit a migration that has already run anywhere. Fix mistakes with a new migration.
- MariaDB commits table changes immediately (they can't be rolled back), so keep each file small
