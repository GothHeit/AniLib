#!/usr/bin/env bash
# Dumps the database to deploy/backups/ and keeps the newest 14. Run it from cron, e.g. daily:
#   0 4 * * * /path/to/AniLib/deploy/backup.sh
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
file="backups/moonroom-$(date +%Y%m%d-%H%M%S).sql.gz"
# Written under a temporary name, so a failed dump never leaves a broken backup behind.
trap 'rm -f "$file.partial"' EXIT
docker compose exec -T db pg_dump -U app app | gzip > "$file.partial"
mv "$file.partial" "$file"
ls -1t backups/moonroom-*.sql.gz | tail -n +15 | xargs -r rm --
echo "$file"
