/* eslint-disable no-console */
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { pool } from '../src/config/config/db';
import { env } from '../src/config/config/env';

/**
 * Finds resource_files rows whose storage object doesn't actually exist in
 * the bucket — orphaned records left behind from the period where
 * STORAGE_PROVIDER was misconfigured (docker-compose hardcoded local-fs,
 * so uploads during that window never reached Supabase Storage even
 * though the DB row and status='READY' were created normally).
 *
 * Dry-run by default (reports only). Pass --delete to actually remove the
 * orphaned resource_files rows found. Parent `resources` rows are left
 * alone — a resource with zero files still renders fine (falls back to
 * the "TEXT" file-type badge), so only the broken file pointers are
 * removed, not the resource's title/description/metadata.
 *
 * Usage:
 *   npm --prefix backend run migrate -- (not this — see below)
 *   npx tsx backend/scripts/findOrphanedResourceFiles.ts
 *   npx tsx backend/scripts/findOrphanedResourceFiles.ts --delete
 */
async function main(): Promise<void> {
  if (env.storage.provider !== 's3' && env.storage.provider !== 'supabase') {
    console.error(
      `STORAGE_PROVIDER is "${env.storage.provider}", not s3/supabase — nothing to check against a bucket.`,
    );
    process.exit(1);
  }

  const shouldDelete = process.argv.includes('--delete');

  const client = new S3Client({
    region: env.storage.region,
    endpoint: env.storage.endpoint || undefined,
    forcePathStyle: Boolean(env.storage.endpoint),
    credentials: {
      accessKeyId: env.storage.accessKeyId,
      secretAccessKey: env.storage.secretAccessKey,
    },
  });

  const { rows } = await pool.query<{
    id: string;
    resource_id: string;
    storage_key: string;
    original_filename: string;
  }>(
    `SELECT id, resource_id, storage_key, original_filename
     FROM resource_files
     WHERE status = 'READY'
     ORDER BY created_at ASC`,
  );

  console.log(`Checking ${rows.length} READY file(s) against bucket "${env.storage.bucket}"...`);

  const orphaned: typeof rows = [];

  for (const row of rows) {
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: env.storage.bucket, Key: row.storage_key }),
      );
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
        ?.httpStatusCode;
      if (status === 404) {
        orphaned.push(row);
      } else {
        console.error(`Unexpected error checking ${row.storage_key}:`, err);
      }
    }
  }

  if (orphaned.length === 0) {
    console.log('No orphaned files found. Nothing to do.');
    await pool.end();
    return;
  }

  console.log(`\nFound ${orphaned.length} orphaned file record(s):`);
  for (const row of orphaned) {
    console.log(`  - resource_files.id=${row.id} resource_id=${row.resource_id} "${row.original_filename}" (key: ${row.storage_key})`);
  }

  if (!shouldDelete) {
    console.log('\nDry run only — re-run with --delete to remove these resource_files rows.');
    await pool.end();
    return;
  }

  for (const row of orphaned) {
    await pool.query(`DELETE FROM resource_files WHERE id = $1`, [row.id]);
  }
  console.log(`\nDeleted ${orphaned.length} orphaned resource_files row(s).`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
