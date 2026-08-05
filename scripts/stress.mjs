// Stress test: hammers a running server with concurrent requests and reports
// throughput + latency percentiles per target. Targets are chosen to never
// write to Supabase: page renders, the unauthorized /api/match path, and the
// /api/submit unknown-kind path (both rejected before any DB work).
//
// Usage: node scripts/stress.mjs [baseUrl]   (default http://localhost:3000)

const BASE = process.argv[2] ?? "http://localhost:3000";

const TARGETS = [
  { name: "GET / (map page)", expect: 200, req: () => fetch(`${BASE}/`) },
  { name: "GET /rent (SSR area index)", expect: 200, req: () => fetch(`${BASE}/rent`) },
  {
    name: "GET /api/match (401 auth reject)",
    expect: 401,
    req: () => fetch(`${BASE}/api/match`),
  },
  {
    name: "POST /api/submit (400 unknown kind)",
    expect: 400,
    req: () =>
      fetch(`${BASE}/api/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "stress-test", payload: {} }),
      }),
  },
];

const ROUNDS = [
  { concurrency: 10, requests: 200 },
  { concurrency: 50, requests: 500 },
];

function pct(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function run(target, { concurrency, requests }) {
  const latencies = [];
  let wrongStatus = 0;
  let failed = 0;
  let issued = 0;
  const started = performance.now();

  async function worker() {
    while (issued < requests) {
      issued++;
      const t0 = performance.now();
      try {
        const res = await target.req();
        await res.arrayBuffer(); // drain the body so timing includes it
        if (res.status !== target.expect) wrongStatus++;
      } catch {
        failed++;
      }
      latencies.push(performance.now() - t0);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  const wall = (performance.now() - started) / 1000;
  latencies.sort((a, b) => a - b);
  return {
    rps: (latencies.length / wall).toFixed(1),
    p50: pct(latencies, 50).toFixed(0),
    p95: pct(latencies, 95).toFixed(0),
    p99: pct(latencies, 99).toFixed(0),
    max: latencies[latencies.length - 1].toFixed(0),
    wrongStatus,
    failed,
  };
}

// Sanity check + warm-up so route compilation doesn't skew round one.
try {
  await fetch(BASE);
} catch {
  console.error(`No server at ${BASE} - start one first (npm run build && npm start)`);
  process.exit(1);
}
for (const t of TARGETS) await t.req().then((r) => r.arrayBuffer());

let bad = 0;
for (const round of ROUNDS) {
  console.log(`\n=== concurrency ${round.concurrency}, ${round.requests} requests/target ===`);
  for (const target of TARGETS) {
    const r = await run(target, round);
    bad += r.wrongStatus + r.failed;
    console.log(
      `${target.name.padEnd(36)} ${String(r.rps).padStart(7)} req/s   ` +
        `p50 ${r.p50}ms  p95 ${r.p95}ms  p99 ${r.p99}ms  max ${r.max}ms` +
        (r.wrongStatus ? `  UNEXPECTED-STATUS ${r.wrongStatus}` : "") +
        (r.failed ? `  FAILED ${r.failed}` : "")
    );
  }
}

console.log(bad === 0 ? "\nAll responses had the expected status." : `\n${bad} bad responses.`);
process.exit(bad === 0 ? 0 : 1);
