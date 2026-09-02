// Maintains the gh-pages branch contents after a report has been copied into
// place: records this run in history.json, prunes archived reports that have
// aged out, and regenerates the history index page.
//
// Run from the root of a gh-pages checkout. Reads its inputs from the
// environment so the workflow passes GitHub context in one place:
//   RUN, STATUS, SHA, REF, ACTOR, SERVER, REPO, RUN_ID
//
// Kept as a committed script rather than inline in the workflow so it is
// linted, formatted, and runnable locally:
//   RUN=1 STATUS=success SHA=abc REF=main ACTOR=me \
//   SERVER=https://github.com REPO=o/r RUN_ID=1 node scripts/publish-report.mjs

import fs from 'node:fs';

// Newest N runs kept in the index; archived reports outside this window are
// deleted so the branch does not grow without bound.
const HISTORY_LIMIT = 50;

const HISTORY_FILE = 'history.json';
const INDEX_FILE = 'history.html';
const RUNS_DIR = 'runs';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — this script expects the workflow's GitHub context.`);
  }
  return value;
}

function readHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`${HISTORY_FILE} is not a JSON array — refusing to overwrite it.`);
  }
  return parsed;
}

function buildEntry() {
  const server = requireEnv('SERVER');
  const repo = requireEnv('REPO');
  const runId = requireEnv('RUN_ID');

  return {
    run: Number(requireEnv('RUN')),
    // The upstream job's result: success | failure | cancelled | skipped.
    status: requireEnv('STATUS'),
    sha: requireEnv('SHA').slice(0, 7),
    ref: requireEnv('REF'),
    actor: requireEnv('ACTOR'),
    date: new Date().toISOString(),
    workflowUrl: `${server}/${repo}/actions/runs/${runId}`,
  };
}

// Drop archived report directories no longer referenced by the trimmed history.
function pruneArchivedRuns(history) {
  if (!fs.existsSync(RUNS_DIR)) return [];

  const kept = new Set(history.map((entry) => String(entry.run)));
  const removed = [];

  for (const dir of fs.readdirSync(RUNS_DIR)) {
    if (!kept.has(dir)) {
      fs.rmSync(`${RUNS_DIR}/${dir}`, { recursive: true, force: true });
      removed.push(dir);
    }
  }

  return removed;
}

// history.html is written from run metadata, which includes branch names and
// usernames — escape before interpolating so neither can inject markup.
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );
}

function renderRow(entry) {
  const passed = entry.status === 'success';
  const timestamp = String(entry.date).replace('T', ' ').slice(0, 16);

  return `      <tr>
        <td><a href="runs/${escapeHtml(entry.run)}/index.html">#${escapeHtml(entry.run)}</a></td>
        <td class="${passed ? 'ok' : 'bad'}">${passed ? 'passed' : escapeHtml(entry.status)}</td>
        <td>${escapeHtml(entry.ref)}</td>
        <td><code>${escapeHtml(entry.sha)}</code></td>
        <td>${escapeHtml(timestamp)} UTC</td>
        <td><a href="${escapeHtml(entry.workflowUrl)}">workflow</a></td>
      </tr>`;
}

function renderIndex(history) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Playwright report history</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        font: 15px/1.5 system-ui, sans-serif;
        margin: 2rem auto;
        max-width: 60rem;
        padding: 0 1rem;
      }
      h1 {
        font-size: 1.3rem;
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      th,
      td {
        text-align: left;
        padding: 0.5rem 0.6rem;
        border-bottom: 1px solid #8883;
      }
      th {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        opacity: 0.7;
      }
      .ok {
        color: #17803d;
      }
      .bad {
        color: #c02626;
      }
      @media (prefers-color-scheme: dark) {
        .ok {
          color: #4ade80;
        }
        .bad {
          color: #f87171;
        }
      }
    </style>
  </head>
  <body>
    <h1>Playwright report history</h1>
    <p><a href="index.html">Latest report</a> — newest ${history.length} runs on main.</p>
    <table>
      <thead>
        <tr>
          <th>Run</th>
          <th>Status</th>
          <th>Branch</th>
          <th>Commit</th>
          <th>Date</th>
          <th>Link</th>
        </tr>
      </thead>
      <tbody>
${history.map(renderRow).join('\n')}
      </tbody>
    </table>
  </body>
</html>
`;
}

const history = [buildEntry(), ...readHistory()].slice(0, HISTORY_LIMIT);

fs.writeFileSync(HISTORY_FILE, `${JSON.stringify(history, null, 2)}\n`);
const removed = pruneArchivedRuns(history);
fs.writeFileSync(INDEX_FILE, renderIndex(history));

console.log(
  `Recorded run #${history[0].run} (${history[0].status}); ` +
    `${history.length} run(s) in history` +
    (removed.length ? `; pruned ${removed.join(', ')}` : '')
);
