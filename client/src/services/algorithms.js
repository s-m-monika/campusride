// Client-side implementations of the academic algorithms so the Algorithm
// Showcase runs REAL computations in the browser (no mock backend). Each
// function returns the result plus a short trace for display.

const R = 6371; // Earth radius km
const toRad = (d) => (d * Math.PI) / 180;

export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c * 1000) / 1000;
}

// KNN: pick K drivers minimising a weighted feature distance.
export function knn(drivers, target, k = 3) {
  const scored = drivers.map((d) => {
    const suitability =
      0.6 * Math.abs((d.distance ?? 0) - (target.distance ?? 0)) +
      0.2 * Math.abs((d.rating ?? 0) - (target.minRating ?? 0)) +
      0.2 * Math.abs((d.eta ?? 0) - (target.maxEta ?? 0));
    return { ...d, suitability: Math.round(suitability * 1000) / 1000 };
  });
  scored.sort((x, y) => x.suitability - y.suitability);
  return scored.slice(0, k);
}

// Greedy: single best driver via weighted score (higher = better).
export function greedyMatch(drivers) {
  const scored = drivers.map((d) => {
    const score =
      (1 / ((d.distance ?? 0) + 0.1)) * 0.5 +
      ((d.rating ?? 0) / 5) * 0.35 +
      (1 / ((d.eta ?? 0) + 1)) * 0.15;
    return { ...d, score: Math.round(score * 1000) / 1000 };
  });
  scored.sort((x, y) => y.score - x.score);
  return { best: scored[0], ranked: scored };
}

// Dijkstra shortest path on a weighted adjacency graph.
export function dijkstra(graph, start, end) {
  const dist = {};
  const prev = {};
  const pq = new Set(Object.keys(graph));
  Object.keys(graph).forEach((n) => (dist[n] = Infinity));
  dist[start] = 0;
  while (pq.size) {
    let u = null;
    pq.forEach((n) => {
      if (u === null || dist[n] < dist[u]) u = n;
    });
    pq.delete(u);
    if (u === end) break;
    Object.entries(graph[u] || {}).forEach(([v, w]) => {
      const alt = dist[u] + w;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    });
  }
  const path = [];
  let cur = end;
  while (cur) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return { path, distance: Math.round(dist[end] * 100) / 100 };
}

// 1D Kalman filter smoothing a noisy sequence.
export function kalman1D(measurements, R_noise = 0.08, Q = 0.01) {
  let x = measurements[0] ?? 0;
  let P = 1;
  const out = [];
  measurements.forEach((z) => {
    P += Q;
    const K = P / (P + R_noise);
    x = x + K * (z - x);
    P = (1 - K) * P;
    out.push(Math.round(x * 10000) / 10000);
  });
  return out;
}

// Bayesian weighted average rating.
export function bayesianRating(avgRating, votes, newRating, m = 5, C = 4.5) {
  const v = votes + 1;
  const R_avg = (avgRating * votes + newRating) / v;
  const wr = (v / (v + m)) * R_avg + (m / (v + m)) * C;
  return Math.round(wr * 100) / 100;
}

// SHA-256 using the Web Crypto API (real cryptographic hash).
export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// A small simulated ACID transaction for the demo.
export function acidTransaction({ balance, fare }) {
  const log = [];
  log.push('BEGIN');
  if (fare <= 0) {
    log.push('ABORT: invalid fare (consistency)');
    return { committed: false, log, balance };
  }
  if (balance < fare) {
    log.push('ABORT: insufficient funds, ROLLBACK (atomicity)');
    return { committed: false, log, balance };
  }
  const newBalance = balance - fare;
  log.push(`DEBIT ${fare}`);
  log.push('COMMIT (durability)');
  return { committed: true, log, balance: newBalance };
}
