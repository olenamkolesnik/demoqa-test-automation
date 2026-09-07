import { test } from '@playwright/test';

type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const dim = '\x1b[2m';
const reset = '\x1b[0m';
const levelColors: Record<Level, string> = {
  DEBUG: dim,
  INFO: '\x1b[36m',
  WARN: '\x1b[33m',
  ERROR: '\x1b[31m',
};

// Always colored except on CI, where raw escape codes would corrupt the log
// viewer (e.g. GitHub Actions). Not gated on isTTY here: Playwright applies
// its own separate ANSI-stripping decision to worker stdout ahead of this,
// based on its own isTTY check — an interactive terminal already passes that,
// so this function only needs to add the CI exception on top of it.
function colorEnabled(): boolean {
  return !process.env.CI;
}

// test.info() only works while a test is actually executing and throws
// otherwise — guard rather than assume a test is always running.
function testContext(): string {
  try {
    const info = test.info();
    return `[w${info.workerIndex}] [${info.title}] `;
  } catch {
    return '';
  }
}

function format(level: Level, message: string): string {
  const timestamp = new Date().toISOString();
  const context = testContext();

  if (!colorEnabled()) {
    return `${timestamp} [${level}] ${context}${message}`;
  }
  return `${dim}${timestamp}${reset} ${levelColors[level]}[${level}]${reset} ${context}${message}`;
}

// Only the literal string "true" enables debug output — a plain truthy
// check would treat DEBUG=false as enabled too, since it's a non-empty string.
// Exported so call sites (e.g. BaseApiClient.logged) can skip building debug-only
// data entirely when disabled, instead of paying the cost and discarding it here.
export function debugEnabled(): boolean {
  return process.env.DEBUG === 'true';
}

export const logger = {
  debug: (message: string): void => {
    if (debugEnabled()) console.log(format('DEBUG', message));
  },
  info: (message: string): void => console.log(format('INFO', message)),
  warn: (message: string): void => console.warn(format('WARN', message)),
  error: (message: string): void => console.error(format('ERROR', message)),
};
