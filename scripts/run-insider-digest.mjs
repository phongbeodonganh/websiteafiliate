import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DAILY_RUN_HOUR_UTC = 12;
const STARTUP_DELAY_MS = 10_000;
const RETRY_DELAY_MS = 60_000;

function readDotEnv(filePath) {
  const values = {};

  try {
    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;

      let value = match[2];
      if (
        value.length >= 2
        && ((value.startsWith('"') && value.endsWith('"'))
          || (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }
      values[match[1]] = value;
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  return values;
}

const projectRoot = resolve(import.meta.dirname, '..');
const fileEnv = {
  ...readDotEnv(resolve(projectRoot, '.env.local')),
  ...readDotEnv(resolve(projectRoot, 'mongodb.env')),
};
const env = { ...fileEnv, ...process.env };
const cronSecret = env.INSIDER_CRON_SECRET?.trim();
const port = env.PORT?.trim() || '3000';
const endpoint = env.INSIDER_CRON_INTERNAL_URL?.trim()
  || `http://127.0.0.1:${port}/api/v1/cron/insider-digest`;

if (!cronSecret) {
  console.error('Insider scheduler error: INSIDER_CRON_SECRET is not configured');
  process.exit(1);
}

function wait(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function sendDigest(reason) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  console.log(`Insider digest completed (${reason}): ${body}`);
}

function millisecondsUntilNextDailyRun(now = new Date()) {
  const nextRun = new Date(now);
  nextRun.setUTCHours(DAILY_RUN_HOUR_UTC, 0, 0, 0);
  if (nextRun <= now) nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  return nextRun.getTime() - now.getTime();
}

async function runUntilSuccessful(reason) {
  while (true) {
    try {
      await sendDigest(reason);
      return;
    } catch (error) {
      console.error(`Insider digest failed (${reason}); retrying in 60 seconds:`, error);
      await wait(RETRY_DELAY_MS);
    }
  }
}

async function main() {
  // Let the freshly restarted Next.js process become ready, then catch up once.
  await wait(STARTUP_DELAY_MS);
  await runUntilSuccessful('deploy');

  while (true) {
    await wait(millisecondsUntilNextDailyRun());
    await runUntilSuccessful('daily');
  }
}

main().catch((error) => {
  console.error('Insider scheduler stopped unexpectedly:', error);
  process.exit(1);
});
