// ======================================================
// IMPORTS
// ======================================================

'use strict';

const express = require('express');
const helmet = require('helmet');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { performance, monitorEventLoopDelay, PerformanceObserver } = require('perf_hooks');
const v8 = require('v8');
const { execFile } = require('child_process');

// ======================================================
// CONFIGURATION
// ======================================================

const app = express();
const PORT = process.env.PORT || 3000;
const PROJECT_ROOT = __dirname;
const PROJECT_CACHE_MS = 30000;
const MAX_HTTP_EVENTS = 300;
const CPU_SAMPLE_MS = 1000;
const MAX_SESSION_SAMPLES = 180;
const SSE_INTERVAL_MS = 1500;
const TASK_ATUALIZAÇÃO_MS = 5000;
const TASK_MAX_ITEMS = 14;

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https:", "http:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"]
      }
    }
  })
);

app.use(express.json({ limit: '100kb' }));

// ======================================================
// HELPERS
// ======================================================

function clamp(value, min = 0, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, digits = 1) {
  const n = safeNumber(value, 0);
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function formatBytes(bytes) {
  const n = safeNumber(bytes, 0);
  if (n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${round(n / (1024 ** index), index >= 3 ? 2 : 1)} ${units[index]}`;
}

function formatUptime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(safeNumber(totalSeconds, 0)));
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(d).padStart(2, '0')}D ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M ${String(s).padStart(2, '0')}S`;
}

function formatPercent(value) {
  return `${round(clamp(value), 1)}%`;
}

function formatDuration(ms) {
  const n = safeNumber(ms, 0);
  return n >= 1000 ? `${round(n / 1000, 2)} s` : `${round(n, 1)} ms`;
}

function formatDate(value = Date.now()) {
  try {
    return new Date(value).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function statusFromValue(value, warn, critical, reverse = false) {
  if (reverse) {
    if (value <= critical) return 'CRÍTICO';
    if (value <= warn) return 'ATENÇÃO';
    return 'NORMAL';
  }
  if (value >= critical) return 'CRÍTICO';
  if (value >= warn) return 'ATENÇÃO';
  return 'NORMAL';
}

function healthLabel(score) {
  if (score >= 90) return 'ÓTIMO';
  if (score >= 75) return 'SAUDÁVEL';
  if (score >= 50) return 'ATENÇÃO';
  return 'CRÍTICO';
}

// ======================================================
// CPU MONITOR
// ======================================================

function readCpuSnapshot() {
  return os.cpus().map((cpu) => ({
    model: cpu.model,
    speed: cpu.speed,
    times: { ...cpu.times }
  }));
}

function cpuTimeTotal(times) {
  return times.user + times.nice + times.sys + times.idle + times.irq;
}

let previousCpuSnapshot = readCpuSnapshot();
let cpuState = {
  usage: 0,
  perCore: previousCpuSnapshot.map(() => 0),
  averageRecent: 0,
  peakRecent: 0,
  history: []
};

function sampleCpu() {
  const current = readCpuSnapshot();
  const perCore = current.map((cpu, index) => {
    const previous = previousCpuSnapshot[index] || cpu;
    const totalDelta = cpuTimeTotal(cpu.times) - cpuTimeTotal(previous.times);
    const idleDelta = cpu.times.idle - previous.times.idle;
    if (totalDelta <= 0) return 0;
    return clamp((1 - idleDelta / totalDelta) * 100);
  });

  const usage = perCore.length
    ? perCore.reduce((sum, value) => sum + value, 0) / perCore.length
    : 0;

  cpuState.usage = round(usage, 1);
  cpuState.perCore = perCore.map((value) => round(value, 1));
  cpuState.history.push(cpuState.usage);
  if (cpuState.history.length > 60) cpuState.history.shift();

  cpuState.averageRecent = cpuState.history.length
    ? round(cpuState.history.reduce((a, b) => a + b, 0) / cpuState.history.length, 1)
    : 0;
  cpuState.peakRecent = cpuState.history.length
    ? round(Math.max(...cpuState.history), 1)
    : 0;

  previousCpuSnapshot = current;
}

setInterval(sampleCpu, CPU_SAMPLE_MS).unref();
sampleCpu();

// ======================================================
// MEMORY MONITOR
// ======================================================

function getMemoryMetrics() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = Math.max(0, total - free);
  const usage = total > 0 ? (used / total) * 100 : 0;
  const processMemory = process.memoryUsage();

  return {
    total,
    used,
    free,
    usage: round(usage, 1),
    totalFormatted: formatBytes(total),
    usedFormatted: formatBytes(used),
    freeFormatted: formatBytes(free),
    process: {
      rss: processMemory.rss,
      heapUsed: processMemory.heapUsed,
      heapTotal: processMemory.heapTotal,
      external: processMemory.external,
      arrayBuffers: processMemory.arrayBuffers || 0,
      rssFormatted: formatBytes(processMemory.rss),
      heapUsedFormatted: formatBytes(processMemory.heapUsed),
      heapTotalFormatted: formatBytes(processMemory.heapTotal),
      externalFormatted: formatBytes(processMemory.external),
      arrayBuffersFormatted: formatBytes(processMemory.arrayBuffers || 0)
    }
  };
}

let previousProcessCpu = process.cpuUsage();
let previousProcessCpuTime = process.hrtime.bigint();
let processCpuPercent = 0;

function sampleProcessCpu() {
  const nowCpu = process.cpuUsage();
  const nowTime = process.hrtime.bigint();
  const elapsedMicros = Number(nowTime - previousProcessCpuTime) / 1000;
  const cpuMicros =
    (nowCpu.user - previousProcessCpu.user) +
    (nowCpu.system - previousProcessCpu.system);
  const cores = Math.max(1, os.cpus().length);
  processCpuPercent = elapsedMicros > 0
    ? clamp((cpuMicros / elapsedMicros / cores) * 100)
    : 0;
  previousProcessCpu = nowCpu;
  previousProcessCpuTime = nowTime;
}

setInterval(sampleProcessCpu, CPU_SAMPLE_MS).unref();

// ======================================================
// EVENT LOOP MONITOR
// ======================================================

const eventLoopHistogram = monitorEventLoopDelay({ resolution: 20 });
eventLoopHistogram.enable();

function getEventLoopMetrics() {
  const mean = Number.isFinite(eventLoopHistogram.mean)
    ? eventLoopHistogram.mean / 1e6
    : 0;
  const max = Number.isFinite(eventLoopHistogram.max)
    ? eventLoopHistogram.max / 1e6
    : 0;

  let label = 'EXCELENTE';
  if (mean > 100) label = 'CRÍTICO';
  else if (mean > 30) label = 'DEGRADADO';
  else if (mean >= 10) label = 'BOM';

  return {
    meanMs: round(mean, 2),
    maxMs: round(max, 2),
    label
  };
}

// ======================================================
// INTELIGÊNCIA DO RUNTIME
// ======================================================

const gcState = {
  total: 0,
  totalDurationMs: 0,
  lastDurationMs: 0,
  lastAt: null
};

try {
  const gcObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      gcState.total += 1;
      gcState.totalDurationMs += safeNumber(entry.duration, 0);
      gcState.lastDurationMs = round(entry.duration, 3);
      gcState.lastAt = formatDate();
    }
  });
  gcObserver.observe({ entryTypes: ['gc'] });
} catch {
  // GC performance entries are optional. Dashboard keeps working without them.
}

let previousElu = performance.eventLoopUtilization ? performance.eventLoopUtilization() : null;

function getRuntimeIntelligence() {
  const heap = v8.getHeapStatistics();
  const resource = typeof process.resourceUsage === 'function' ? process.resourceUsage() : null;
  let elu = { utilization: 0, active: 0, idle: 0 };

  if (performance.eventLoopUtilization) {
    try {
      const current = performance.eventLoopUtilization(previousElu || undefined);
      previousElu = performance.eventLoopUtilization();
      elu = {
        utilization: round(clamp(current.utilization * 100), 2),
        active: round(current.active, 2),
        idle: round(current.idle, 2)
      };
    } catch {
      // Keep safe fallback values.
    }
  }

  return {
    eventLoopUtilization: elu,
    heap: {
      heapSizeLimit: heap.heap_size_limit || 0,
      totalAvailableSize: heap.total_available_size || 0,
      usedHeapSize: heap.used_heap_size || 0,
      mallocedMemory: heap.malloced_memory || 0,
      externalMemory: heap.external_memory || 0,
      heapSizeLimitFormatted: formatBytes(heap.heap_size_limit || 0),
      totalAvailableSizeFormatted: formatBytes(heap.total_available_size || 0)
    },
    gc: {
      total: gcState.total,
      averageDurationMs: gcState.total ? round(gcState.totalDurationMs / gcState.total, 3) : 0,
      lastDurationMs: gcState.lastDurationMs,
      lastAt: gcState.lastAt
    },
    resourceUsage: resource ? {
      userCpuTimeMs: round(resource.userCPUTime / 1000, 2),
      systemCpuTimeMs: round(resource.systemCPUTime / 1000, 2),
      maxRssKb: resource.maxRSS,
      maxRssFormatted: formatBytes(resource.maxRSS * 1024),
      fsRead: resource.fsRead,
      fsWrite: resource.fsWrite,
      voluntaryContextSwitches: resource.voluntaryContextSwitches,
      involuntaryContextSwitches: resource.involuntaryContextSwitches
    } : null,
    nodeTiming: {
      nodeStartMs: round(performance.nodeTiming?.nodeStart || 0, 2),
      v8StartMs: round(performance.nodeTiming?.v8Start || 0, 2),
      bootstrapCompleteMs: round(performance.nodeTiming?.bootstrapComplete || 0, 2),
      loopStartMs: round(performance.nodeTiming?.loopStart || 0, 2)
    }
  };
}

const sessionSamples = [];

function pushSessionSample(sample) {
  sessionSamples.push(sample);
  if (sessionSamples.length > MAX_SESSION_SAMPLES) {
    sessionSamples.splice(0, sessionSamples.length - MAX_SESSION_SAMPLES);
  }
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function getSessionIntelligence() {
  if (!sessionSamples.length) {
    return {
      samples: 0,
      cpu: { average: 0, peak: 0, p95: 0 },
      memory: { average: 0, peak: 0, p95: 0 },
      eventLoop: { average: 0, peak: 0, p95: 0 },
      health: { average: 0, minimum: 0 },
      anomaly: { level: 'APRENDENDO', score: 0, message: 'Construindo linha de base' }
    };
  }

  const cpus = sessionSamples.map((s) => s.cpu);
  const memories = sessionSamples.map((s) => s.memory);
  const loops = sessionSamples.map((s) => s.loop);
  const health = sessionSamples.map((s) => s.health);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
  const latest = sessionSamples[sessionSamples.length - 1];

  const baseline = sessionSamples.slice(0, -1).slice(-60);
  let anomalyScore = 0;
  if (baseline.length >= 12) {
    const features = [
      ['CPU', baseline.map((x) => x.cpu), latest.cpu],
      ['RAM', baseline.map((x) => x.memory), latest.memory],
      ['LOOP', baseline.map((x) => x.loop), latest.loop]
    ];
    for (const [, values, current] of features) {
      const mean = avg(values);
      const variance = avg(values.map((x) => (x - mean) ** 2));
      const std = Math.sqrt(variance);
      if (std > 0.25) anomalyScore = Math.max(anomalyScore, Math.abs(current - mean) / std);
    }
  }

  const anomaly = anomalyScore >= 3
    ? { level: 'HIGH', score: round(anomalyScore, 2), message: 'A telemetria desviou fortemente da linha de base recente' }
    : anomalyScore >= 2
      ? { level: 'ELEVATED', score: round(anomalyScore, 2), message: 'Padrão incomum de telemetria detectado' }
      : baseline.length >= 12
        ? { level: 'NORMAL', score: round(anomalyScore, 2), message: 'A telemetria permanece dentro da linha de base recente' }
        : { level: 'APRENDENDO', score: round(anomalyScore, 2), message: 'Construindo linha de base' };

  return {
    samples: sessionSamples.length,
    cpu: { average: round(avg(cpus), 1), peak: round(Math.max(...cpus), 1), p95: round(percentile(cpus, 95), 1) },
    memory: { average: round(avg(memories), 1), peak: round(Math.max(...memories), 1), p95: round(percentile(memories, 95), 1) },
    eventLoop: { average: round(avg(loops), 2), peak: round(Math.max(...loops), 2), p95: round(percentile(loops, 95), 2) },
    health: { average: round(avg(health), 0), minimum: round(Math.min(...health), 0) },
    anomaly
  };
}

function getStorageMetrics() {
  try {
    if (typeof fs.statfsSync !== 'function') return null;
    const stat = fs.statfsSync(PROJECT_ROOT);
    const blockSize = safeNumber(stat.bsize || stat.frsize, 0);
    const total = safeNumber(stat.blocks, 0) * blockSize;
    const free = safeNumber(stat.bavail ?? stat.bfree, 0) * blockSize;
    const used = Math.max(0, total - free);
    return {
      total,
      used,
      free,
      usage: total > 0 ? round((used / total) * 100, 1) : 0,
      totalFormatted: formatBytes(total),
      usedFormatted: formatBytes(used),
      freeFormatted: formatBytes(free)
    };
  } catch {
    return null;
  }
}

// ======================================================
// NETWORK
// ======================================================

function getNetworkMetrics() {
  const networkInterfaces = os.networkInterfaces();
  const interfaces = [];
  let primary = null;

  for (const [name, entries] of Object.entries(networkInterfaces)) {
    for (const item of entries || []) {
      const normalized = {
        interface: name,
        address: item.address || 'N/A',
        family: item.family || 'N/A',
        mac: item.mac || 'N/A',
        cidr: item.cidr || 'N/A',
        internal: Boolean(item.internal)
      };
      interfaces.push(normalized);

      const isIPv4 = item.family === 'IPv4' || item.family === 4;
      if (!primary && isIPv4 && !item.internal) {
        primary = normalized;
      }
    }
  }

  if (!primary) {
    primary = interfaces.find((entry) => entry.family === 'IPv4' || entry.family === 4) || null;
  }

  return {
    primaryIp: primary ? primary.address : 'N/A',
    primaryInterface: primary ? primary.interface : 'N/A',
    interfaces
  };
}

// ======================================================
// CLOUD DETECTION
// ======================================================

function detectCloudEnvironment() {
  const env = process.env;
  let provider = 'LOCAL';
  let mode = 'LOCAL MACHINE';
  let evidence = 'No known cloud provider environment variables detected';

  if (env.RENDER || env.RENDER_SERVICE_ID || env.RENDER_EXTERNAL_HOSTNAME) {
    provider = 'RENDER';
    mode = 'RENDER CLOUD';
    evidence = 'Render environment variable detected';
  } else if (env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_ID || env.RAILWAY_SERVICE_ID) {
    provider = 'RAILWAY';
    mode = 'RAILWAY CLOUD';
    evidence = 'Railway environment variable detected';
  } else if (env.FLY_APP_NAME || env.FLY_REGION || env.FLY_MACHINE_ID) {
    provider = 'FLY.IO';
    mode = 'FLY.IO CLOUD';
    evidence = 'Fly.io environment variable detected';
  } else if (env.DYNO && env.HEROKU_APP_NAME) {
    provider = 'HEROKU';
    mode = 'HEROKU CLOUD';
    evidence = 'Heroku environment variable detected';
  } else if (env.VERCEL || env.VERCEL_ENV || env.VERCEL_URL) {
    provider = 'VERCEL';
    mode = 'VERCEL ENVIRONMENT';
    evidence = 'Vercel environment variable detected';
  } else if (fs.existsSync('/.dockerenv')) {
    provider = 'DOCKER';
    mode = 'DOCKER CONTAINER';
    evidence = '/.dockerenv detected';
  }

  const region =
    env.RENDER_REGION ||
    env.RAILWAY_REGION ||
    env.FLY_REGION ||
    env.AWS_REGION ||
    env.REGION ||
    'N/A';

  return {
    provider,
    deploymentMode: mode,
    evidence,
    region,
    port: String(PORT),
    nodeEnv: env.NODE_ENV || 'N/A',
    hostname: os.hostname(),
    platform: os.platform(),
    architecture: os.arch(),
    nodeVersion: process.version,
    render: provider === 'RENDER' ? {
      externalUrl: env.RENDER_EXTERNAL_URL || (env.RENDER_EXTERNAL_HOSTNAME ? `https://${env.RENDER_EXTERNAL_HOSTNAME}` : 'N/A'),
      serviceName: env.RENDER_SERVICE_NAME || 'N/A',
      serviceType: env.RENDER_SERVICE_TYPE || 'N/A',
      cpuCount: env.RENDER_CPU_COUNT || 'N/A',
      instanceId: env.RENDER_INSTANCE_ID ? String(env.RENDER_INSTANCE_ID).slice(0, 12) + '…' : 'N/A',
      webConcurrency: env.RENDER_WEB_CONCURRENCY || env.WEB_CONCURRENCY || 'N/A'
    } : null
  };
}

// ======================================================
// PROJECT ANALYZER
// ======================================================

let projectCache = {
  at: 0,
  data: null
};

function analyzeProject() {
  const now = Date.now();
  if (projectCache.data && now - projectCache.at < PROJECT_CACHE_MS) {
    return projectCache.data;
  }

  const stats = {
    files: 0,
    directories: 0,
    size: 0,
    extensions: {},
    jsFiles: 0,
    jsonFiles: 0,
    mdFiles: 0
  };

  const ignored = new Set(['node_modules', '.git']);

  function walk(directory) {
    let entries = [];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        stats.directories += 1;
        walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      stats.files += 1;
      try {
        stats.size += fs.statSync(fullPath).size;
      } catch {
        // File may disappear between read and stat; ignore safely.
      }

      const ext = path.extname(entry.name).toLowerCase() || '[no extension]';
      stats.extensions[ext] = (stats.extensions[ext] || 0) + 1;
      if (ext === '.js') stats.jsFiles += 1;
      if (ext === '.json') stats.jsonFiles += 1;
      if (ext === '.md') stats.mdFiles += 1;
    }
  }

  walk(PROJECT_ROOT);

  const data = {
    ...stats,
    sizeFormatted: formatBytes(stats.size)
  };

  projectCache = { at: now, data };
  return data;
}

// ======================================================
// HTTP TELEMETRY
// ======================================================

const httpTelemetry = {
  totalRequests: 0,
  totalDurationMs: 0,
  status: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
  recent: [],
  lastRequest: null
};

app.use((req, res, next) => {
  const started = performance.now();

  res.on('finish', () => {
    const duration = performance.now() - started;
    const timestamp = Date.now();
    httpTelemetry.totalRequests += 1;
    httpTelemetry.totalDurationMs += duration;

    const bucket =
      res.statusCode >= 500 ? '5xx' :
      res.statusCode >= 400 ? '4xx' :
      res.statusCode >= 300 ? '3xx' :
      '2xx';

    httpTelemetry.status[bucket] += 1;
    httpTelemetry.lastRequest = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: round(duration, 2),
      timestamp: formatDate(timestamp)
    };

    httpTelemetry.recent.push({
      timestamp,
      durationMs: duration,
      statusCode: res.statusCode
    });

    if (httpTelemetry.recent.length > MAX_HTTP_EVENTS) {
      httpTelemetry.recent.splice(0, httpTelemetry.recent.length - MAX_HTTP_EVENTS);
    }
  });

  next();
});

function getHttpMetrics() {
  const cutoff = Date.now() - 60000;
  httpTelemetry.recent = httpTelemetry.recent.filter((item) => item.timestamp >= cutoff);
  const requestsPerMinute = httpTelemetry.recent.length;
  const avgResponseTimeMs = httpTelemetry.totalRequests
    ? httpTelemetry.totalDurationMs / httpTelemetry.totalRequests
    : 0;
  const errors = httpTelemetry.status['4xx'] + httpTelemetry.status['5xx'];
  const errorRate = httpTelemetry.totalRequests
    ? (errors / httpTelemetry.totalRequests) * 100
    : 0;

  return {
    totalRequests: httpTelemetry.totalRequests,
    requestsPerMinute,
    avgResponseTimeMs: round(avgResponseTimeMs, 2),
    status: { ...httpTelemetry.status },
    errorRate: round(errorRate, 2),
    lastRequest: httpTelemetry.lastRequest
  };
}

// ======================================================
// TASK MANAGER // READ-ONLY PROCESS OBSERVER
// ======================================================

let taskManagerCache = {
  supported: true,
  mode: 'INICIALIZANDO',
  source: 'OBSERVADOR DE PROCESSOS NEXUS',
  updatedAt: null,
  totalVisible: 0,
  items: [],
  error: null
};

function normalizeTaskName(value) {
  return String(value || 'unknown').replace(/[\r\n\t]/g, ' ').trim().slice(0, 80) || 'unknown';
}

function currentNodeTask() {
  const memory = process.memoryUsage();
  return {
    pid: process.pid,
    name: normalizeTaskName(process.title || 'node'),
    cpuPercent: round(processCpuPercent, 2),
    cpuTime: null,
    memoryBytes: memory.rss,
    memoryFormatted: formatBytes(memory.rss),
    memoryPercent: os.totalmem() > 0 ? round((memory.rss / os.totalmem()) * 100, 2) : 0,
    nexus: true
  };
}

function finalizeTaskManager(items, source, mode = 'FULL') {
  const safeItems = Array.isArray(items) ? items
    .filter(Boolean)
    .map((item) => ({
      pid: Math.max(0, Math.floor(safeNumber(item.pid, 0))),
      name: normalizeTaskName(item.name),
      cpuPercent: item.cpuPercent === null || item.cpuPercent === undefined ? null : round(item.cpuPercent, 2),
      cpuTime: item.cpuTime === null || item.cpuTime === undefined ? null : round(item.cpuTime, 2),
      memoryBytes: Math.max(0, safeNumber(item.memoryBytes, 0)),
      memoryFormatted: formatBytes(item.memoryBytes),
      memoryPercent: item.memoryPercent === null || item.memoryPercent === undefined ? null : round(item.memoryPercent, 2),
      nexus: Boolean(item.nexus) || Number(item.pid) === process.pid
    }))
    .filter((item) => item.pid > 0)
    .slice(0, TASK_MAX_ITEMS) : [];

  if (!safeItems.some((item) => item.pid === process.pid)) {
    safeItems.unshift(currentNodeTask());
    if (safeItems.length > TASK_MAX_ITEMS) safeItems.length = TASK_MAX_ITEMS;
  }

  taskManagerCache = {
    supported: true,
    mode,
    source,
    updatedAt: new Date().toISOString(),
    totalVisible: safeItems.length,
    items: safeItems,
    error: null
  };
}

function taskFallback(error) {
  taskManagerCache = {
    supported: false,
    mode: 'LIMITED',
    source: 'SOMENTE PROCESSO NODE',
    updatedAt: new Date().toISOString(),
    totalVisible: 1,
    items: [currentNodeTask()],
    error: error ? String(error.message || error).slice(0, 160) : 'Enumeração de processos indisponível'
  };
}

function refreshTaskManager() {
  if (process.platform === 'win32') {
    const command = [
      '$p = Get-Process | Sort-Object CPU -Descending | Select-Object -First ' + TASK_MAX_ITEMS + ' Id,ProcessName,CPU,WorkingSet64;',
      '$p | ConvertTo-Json -Compress'
    ].join(' ');

    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      windowsHide: true,
      timeout: 3000,
      maxBuffer: 512 * 1024
    }, (error, stdout) => {
      if (error) return taskFallback(error);
      try {
        let parsed = JSON.parse(String(stdout || '[]').trim() || '[]');
        if (!Array.isArray(parsed)) parsed = [parsed];
        const total = os.totalmem();
        const items = parsed.map((item) => ({
          pid: item.Id,
          name: item.ProcessName,
          cpuPercent: null,
          cpuTime: item.CPU,
          memoryBytes: item.WorkingSet64,
          memoryPercent: total > 0 ? (safeNumber(item.WorkingSet64) / total) * 100 : 0
        }));
        finalizeTaskManager(items, 'WINDOWS POWERSHELL / GET-PROCESS', 'WINDOWS');
      } catch (parseError) {
        taskFallback(parseError);
      }
    });
    return;
  }

  execFile('ps', ['-eo', 'pid=,comm=,%cpu=,%mem=,rss=', '--sort=-%cpu'], {
    timeout: 1800,
    maxBuffer: 512 * 1024
  }, (error, stdout) => {
    if (error) return taskFallback(error);
    try {
      const lines = String(stdout || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, TASK_MAX_ITEMS);
      const items = lines.map((line) => {
        const parts = line.split(/\s+/);
        const pid = parts.shift();
        const name = parts.shift();
        const cpu = parts.shift();
        const mem = parts.shift();
        const rssKb = parts.shift();
        return {
          pid,
          name,
          cpuPercent: cpu,
          cpuTime: null,
          memoryBytes: safeNumber(rssKb) * 1024,
          memoryPercent: mem
        };
      });
      finalizeTaskManager(items, 'POSIX PS / SOMENTE LEITURA', process.env.RENDER ? 'RENDER / LINUX' : 'POSIX');
    } catch (parseError) {
      taskFallback(parseError);
    }
  });
}

refreshTaskManager();
setInterval(refreshTaskManager, TASK_ATUALIZAÇÃO_MS).unref();

function getTaskManagerMetrics() {
  return {
    ...taskManagerCache,
    currentPid: process.pid,
    refreshMs: TASK_ATUALIZAÇÃO_MS,
    readOnly: true,
    note: 'Observador somente leitura. Nenhum comando de encerramento de processo é exposto.'
  };
}

// ======================================================
// HEALTH ENGINE
// ======================================================

function penaltyScore(value, warningStart, criticalStart) {
  if (value <= warningStart) return 100;
  if (value >= criticalStart) return Math.max(0, 45 - (value - criticalStart) * 2);
  const t = (value - warningStart) / (criticalStart - warningStart);
  return 100 - t * 45;
}

function buildHealth(cpuUsage, memoryUsage, eventLoop, http) {
  const cpuHealth = clamp(penaltyScore(cpuUsage, 60, 90));
  const memoryHealth = clamp(penaltyScore(memoryUsage, 65, 90));
  const runtimeHealth = clamp(penaltyScore(processCpuPercent, 50, 85));
  const eventLoopHealth = clamp(
    eventLoop.meanMs <= 10 ? 100 :
    eventLoop.meanMs <= 30 ? 85 :
    eventLoop.meanMs <= 100 ? 60 :
    Math.max(0, 40 - (eventLoop.meanMs - 100) / 5)
  );
  const apiHealth = clamp(100 - Math.min(100, http.errorRate * 6));

  const score = round(
    cpuHealth * 0.25 +
    memoryHealth * 0.25 +
    runtimeHealth * 0.15 +
    eventLoopHealth * 0.20 +
    apiHealth * 0.15,
    0
  );

  return {
    score,
    label: healthLabel(score),
    components: {
      cpu: round(cpuHealth, 0),
      memory: round(memoryHealth, 0),
      runtime: round(runtimeHealth, 0),
      eventLoop: round(eventLoopHealth, 0),
      api: round(apiHealth, 0),
      network: getNetworkMetrics().primaryIp !== 'N/A' ? 100 : 75
    }
  };
}

function buildAlerts(cpuUsage, memoryUsage, eventLoop, http) {
  const alerts = [];

  if (cpuUsage >= 90) alerts.push({ level: 'critical', message: 'Uso da CPU está criticamente alto' });
  else if (cpuUsage >= 70) alerts.push({ level: 'warning', message: 'Uso da CPU está elevado' });
  else alerts.push({ level: 'ok', message: 'CPU operando normalmente' });

  if (memoryUsage >= 85) alerts.push({ level: 'critical', message: 'Uso de memória está criticamente alto' });
  else if (memoryUsage >= 70) alerts.push({ level: 'warning', message: 'Uso de memória está elevado' });
  else alerts.push({ level: 'ok', message: 'Uso de memória está estável' });

  if (eventLoop.meanMs > 100) alerts.push({ level: 'critical', message: 'Event loop com atraso crítico' });
  else if (eventLoop.meanMs > 30) alerts.push({ level: 'warning', message: 'Event loop está degradado' });
  else alerts.push({ level: 'ok', message: 'Event loop saudável' });

  if (http.errorRate >= 10) alerts.push({ level: 'warning', message: `Taxa de erros HTTP em ${http.errorRate}%` });
  else alerts.push({ level: 'ok', message: 'Serviço HTTP saudável' });

  return alerts;
}

// ======================================================
// API
// ======================================================

function collectDashboardData() {
  const cpus = os.cpus();
  const memory = getMemoryMetrics();
  const eventLoop = getEventLoopMetrics();
  const network = getNetworkMetrics();
  const environment = detectCloudEnvironment();
  const project = analyzeProject();
  const http = getHttpMetrics();
  const runtimeIntelligence = getRuntimeIntelligence();
  const storage = getStorageMetrics();
  const taskManager = getTaskManagerMetrics();
  const health = buildHealth(cpuState.usage, memory.usage, eventLoop, http);
  const alerts = buildAlerts(cpuState.usage, memory.usage, eventLoop, http);

  pushSessionSample({
    at: Date.now(),
    cpu: cpuState.usage,
    memory: memory.usage,
    loop: eventLoop.meanMs,
    health: health.score
  });

  const session = getSessionIntelligence();
  const cpuHeadroom = round(100 - clamp(cpuState.usage), 1);
  const memoryHeadroom = round(100 - clamp(memory.usage), 1);
  const loopHeadroom = round(clamp(100 - Math.min(100, eventLoop.meanMs)), 1);

  return {
    system: {
      hostname: os.hostname(),
      type: os.type(),
      platform: os.platform(),
      release: os.release(),
      architecture: os.arch(),
      endianness: os.endianness(),
      cpuModel: cpus[0]?.model || 'N/A',
      cpuCores: cpus.length,
      availableParallelism: typeof os.availableParallelism === 'function' ? os.availableParallelism() : cpus.length,
      cpuSpeedMHz: cpus[0]?.speed || 0,
      nodeVersion: process.version,
      v8Version: process.versions.v8 || 'N/A',
      pid: process.pid,
      ppid: process.ppid,
      tempDirectory: os.tmpdir(),
      uptime: os.uptime(),
      uptimeFormatted: formatUptime(os.uptime())
    },
    cpu: {
      usage: cpuState.usage,
      headroom: cpuHeadroom,
      perCore: cpuState.perCore,
      cores: cpus.length,
      model: cpus[0]?.model || 'N/A',
      speedMHz: cpus[0]?.speed || 0,
      loadAverage: os.loadavg().map((value) => round(value, 2)),
      normalizedLoad1m: cpus.length ? round((os.loadavg()[0] / cpus.length) * 100, 1) : 0,
      averageRecent: cpuState.averageRecent,
      peakRecent: cpuState.peakRecent,
      processUsage: round(processCpuPercent, 2)
    },
    memory: {
      ...memory,
      headroom: memoryHeadroom
    },
    runtime: {
      node: process.version,
      v8: process.versions.v8 || 'N/A',
      uv: process.versions.uv || 'N/A',
      openssl: process.versions.openssl || 'N/A',
      zlib: process.versions.zlib || 'N/A',
      processTitle: process.title,
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),
      intelligence: runtimeIntelligence
    },
    network,
    environment,
    project,
    storage,
    taskManager,
    http,
    eventLoop: {
      ...eventLoop,
      headroom: loopHeadroom
    },
    health,
    session,
    alerts
  };
}

function publicSnapshot(data) {
  return {
    schema: 'nexus-os-live-v3',
    timestamp: new Date().toISOString(),
    nodeId: `${data.environment.provider}:${data.system.hostname}`,
    provider: data.environment.provider,
    deploymentMode: data.environment.deploymentMode,
    region: data.environment.region,
    hostname: data.system.hostname,
    os: data.system.type,
    platform: data.system.platform,
    kernel: data.system.release,
    architecture: data.system.architecture,
    nodeVersion: data.runtime.node,
    cpu: {
      model: data.cpu.model,
      cores: data.cpu.cores,
      usage: data.cpu.usage,
      headroom: data.cpu.headroom,
      processUsage: data.cpu.processUsage,
      loadAverage: data.cpu.loadAverage
    },
    memory: {
      total: data.memory.total,
      used: data.memory.used,
      free: data.memory.free,
      usage: data.memory.usage,
      headroom: data.memory.headroom
    },
    uptime: data.system.uptime,
    processUptime: data.runtime.uptime,
    eventLoop: {
      meanMs: data.eventLoop.meanMs,
      maxMs: data.eventLoop.maxMs,
      label: data.eventLoop.label,
      utilization: data.runtime.intelligence.eventLoopUtilization.utilization
    },
    health: data.health,
    http: {
      requestsPerMinute: data.http.requestsPerMinute,
      avgResponseTimeMs: data.http.avgResponseTimeMs,
      errorRate: data.http.errorRate,
      totalRequests: data.http.totalRequests
    },
    session: data.session,
    taskManager: { mode: data.taskManager.mode, totalVisible: data.taskManager.totalVisible, readOnly: true }
  };
}

app.get('/api/dashboard', (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: collectDashboardData()
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Não foi possível coletar a telemetria do sistema'
    });
  }
});

app.get('/api/public-snapshot', (req, res) => {
  try {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'no-store'
    });
    res.json({
      success: true,
      ...publicSnapshot(collectDashboardData())
    });
  } catch (error) {
    console.error('Public snapshot error:', error);
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Não foi possível criar o resumo público da telemetria'
    });
  }
});

app.options('/api/public-snapshot', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.status(204).end();
});

app.get('/api/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders?.();

  const send = () => {
    try {
      const payload = {
        success: true,
        timestamp: new Date().toISOString(),
        data: collectDashboardData()
      };
      res.write(`event: telemetry\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch (error) {
      res.write(`event: fault\ndata: ${JSON.stringify({ message: 'telemetria indisponível' })}\n\n`);
    }
  };

  send();
  const timer = setInterval(send, SSE_INTERVAL_MS);
  const heartbeat = setInterval(() => res.write(`: nexus-heartbeat ${Date.now()}\n\n`), 15000);

  req.on('close', () => {
    clearInterval(timer);
    clearInterval(heartbeat);
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    status: 'online'
  });
});

// ======================================================
// DASHBOARD HTML
// ======================================================

const dashboardHTML = String.raw`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#05070d">
  <title>NEXUS OS V3 // MATRIZ DE OBSERVABILIDADE OMEGA</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Orbitron:wght@500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    :root {
      --bg0: #05070d;
      --bg1: #080b12;
      --bg2: #0d111c;
      --cyan: #00eaff;
      --green: #00ff9d;
      --purple: #7a5cff;
      --violet: #a855f7;
      --yellow: #ffd43b;
      --red: #ff375f;
      --white: #ffffff;
      --muted: #8c9bb5;
      --line: rgba(0, 234, 255, 0.16);
      --panel: rgba(8, 12, 22, 0.72);
      --panel-strong: rgba(12, 18, 31, 0.92);
      --shadow: 0 0 28px rgba(0, 234, 255, 0.08);
      --radius: 16px;
      --header-h: 86px;
      color-scheme: dark;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--white);
      background:
        radial-gradient(circle at 15% 15%, rgba(0, 234, 255, 0.08), transparent 22%),
        radial-gradient(circle at 85% 10%, rgba(122, 92, 255, 0.09), transparent 24%),
        radial-gradient(circle at 50% 85%, rgba(0, 255, 157, 0.04), transparent 24%),
        var(--bg0);
      font-family: Inter, system-ui, sans-serif;
      overflow-x: hidden;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(rgba(0, 234, 255, 0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 234, 255, 0.035) 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: linear-gradient(to bottom, rgba(0,0,0,.8), transparent 92%);
      z-index: -2;
    }

    body::after {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background: repeating-linear-gradient(
        to bottom,
        rgba(255,255,255,0.008) 0,
        rgba(255,255,255,0.008) 1px,
        transparent 1px,
        transparent 4px
      );
      z-index: 9997;
      opacity: .55;
    }

    button, input { font: inherit; }
    button { cursor: pointer; }

    .noise {
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      opacity: .4;
      background:
        linear-gradient(90deg, transparent 49.5%, rgba(0,234,255,.025) 50%, transparent 50.5%);
      background-size: 160px 160px;
      animation: drift 18s linear infinite;
    }

    @keyframes drift { to { transform: translate3d(160px, 80px, 0); } }
    @keyframes pulse { 50% { opacity: .35; transform: scale(.88); } }
    @keyframes shimmer { to { background-position: -200% 0; } }
    @keyframes cardIn { from { opacity: 0; transform: translateY(16px) scale(.985); } to { opacity: 1; transform: none; } }
    @keyframes scan { from { transform: translateY(-20vh); } to { transform: translateY(120vh); } }
    @keyframes orbit { to { transform: rotate(360deg); } }
    @keyframes orbitReverse { to { transform: rotate(-360deg); } }
    @keyframes bootBlink { 50% { opacity: .45; } }

    .scanline {
      position: fixed;
      left: 0;
      right: 0;
      height: 2px;
      top: 0;
      background: linear-gradient(90deg, transparent, rgba(0,234,255,.35), transparent);
      filter: blur(.3px);
      z-index: 9996;
      pointer-events: none;
      opacity: .22;
      animation: scan 8s linear infinite;
    }

    .boot {
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: #020408;
      display: grid;
      place-items: center;
      transition: opacity .6s ease, visibility .6s ease;
    }

    .boot.hidden { opacity: 0; visibility: hidden; }
    .boot-panel {
      width: min(760px, 90vw);
      border: 1px solid rgba(0,234,255,.35);
      background: rgba(2,7,12,.94);
      box-shadow: 0 0 60px rgba(0,234,255,.12), inset 0 0 35px rgba(0,234,255,.04);
      padding: clamp(22px, 5vw, 48px);
      position: relative;
    }
    .boot-panel::before, .boot-panel::after {
      content: "";
      position: absolute;
      width: 56px;
      height: 10px;
      border-top: 2px solid var(--cyan);
      top: -1px;
    }
    .boot-panel::before { left: -1px; border-left: 2px solid var(--cyan); }
    .boot-panel::after { right: -1px; border-right: 2px solid var(--cyan); }
    .boot-brand {
      color: var(--cyan);
      font-family: Orbitron, sans-serif;
      font-weight: 800;
      letter-spacing: .18em;
      margin-bottom: 24px;
    }
    .boot-lines {
      font-family: "JetBrains Mono", monospace;
      color: #a9c7d5;
      line-height: 1.9;
      font-size: clamp(11px, 2vw, 14px);
    }
    .boot-lines .ok { color: var(--green); }
    .boot-lines .active { color: var(--cyan); animation: bootBlink 1s infinite; }

    .shell { width: min(1900px, calc(100% - 28px)); margin: 0 auto 72px; }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      min-height: var(--header-h);
      margin: 12px auto 16px;
      padding: 14px 16px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(5, 8, 15, .82);
      backdrop-filter: blur(18px);
      box-shadow: var(--shadow);
      display: grid;
      grid-template-columns: minmax(260px, 1.3fr) auto minmax(420px, 1.6fr);
      align-items: center;
      gap: 16px;
    }

    .brand { display: flex; gap: 14px; align-items: center; min-width: 0; }
    .brand-mark {
      width: 44px; height: 44px; border-radius: 12px;
      border: 1px solid rgba(0,234,255,.55);
      display: grid; place-items: center;
      background: radial-gradient(circle, rgba(0,234,255,.12), rgba(122,92,255,.04));
      box-shadow: 0 0 24px rgba(0,234,255,.16);
      color: var(--cyan);
    }
    .brand h1 {
      margin: 0; font-family: Orbitron, sans-serif; font-size: clamp(18px, 2vw, 25px);
      letter-spacing: .14em; line-height: 1.05;
    }
    .brand p { margin: 6px 0 0; color: var(--muted); font: 600 10px/1 "JetBrains Mono", monospace; letter-spacing: .17em; }

    .live-pill {
      justify-self: center;
      display: inline-flex; align-items: center; gap: 9px;
      padding: 9px 12px; border-radius: 999px;
      border: 1px solid rgba(0,255,157,.25);
      background: rgba(0,255,157,.055);
      font: 700 10px/1 "JetBrains Mono", monospace;
      color: var(--green); letter-spacing: .12em;
      white-space: nowrap;
    }
    .live-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 12px currentColor; animation: pulse 1.5s infinite; }
    .live-pill.syncing { color: var(--yellow); border-color: rgba(255,212,59,.25); background: rgba(255,212,59,.05); }
    .live-pill.lost { color: var(--red); border-color: rgba(255,55,95,.25); background: rgba(255,55,95,.05); }

    .header-right { display: flex; align-items: center; justify-content: flex-end; gap: 9px; flex-wrap: wrap; }
    .host-chip, .clock-chip {
      min-width: 112px; padding: 8px 10px;
      border: 1px solid rgba(255,255,255,.08); border-radius: 10px;
      background: rgba(255,255,255,.025);
    }
    .chip-label { display: block; color: #62738e; font: 700 8px/1 "JetBrains Mono", monospace; letter-spacing: .13em; margin-bottom: 4px; }
    .chip-value { display: block; font: 700 11px/1.2 "JetBrains Mono", monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .btn {
      border: 1px solid rgba(0,234,255,.18);
      background: rgba(0,234,255,.04);
      color: #bfeef2;
      min-height: 34px;
      padding: 7px 10px;
      border-radius: 9px;
      display: inline-flex; align-items: center; justify-content: center; gap: 7px;
      font: 700 9px/1 "JetBrains Mono", monospace;
      letter-spacing: .07em;
      transition: .2s ease;
    }
    .btn:hover, .btn:focus-visible {
      border-color: rgba(0,234,255,.55);
      color: white;
      box-shadow: 0 0 18px rgba(0,234,255,.12), inset 0 0 16px rgba(0,234,255,.04);
      transform: translateY(-1px);
      outline: none;
    }
    .btn i { width: 14px; height: 14px; }

    .section-label {
      margin: 22px 0 10px;
      display: flex; align-items: center; gap: 12px;
      color: #7593a7;
      font: 700 9px/1 "JetBrains Mono", monospace;
      letter-spacing: .18em;
      text-transform: uppercase;
    }
    .section-label::after { content: ""; height: 1px; flex: 1; background: linear-gradient(90deg, rgba(0,234,255,.16), transparent); }

    .grid { display: grid; gap: 12px; }
    .kpis { grid-template-columns: repeat(6, minmax(150px, 1fr)); }

    .panel, .kpi {
      position: relative;
      border: 1px solid rgba(0,234,255,.12);
      background: linear-gradient(145deg, rgba(11,16,28,.83), rgba(5,8,15,.72));
      border-radius: var(--radius);
      box-shadow: var(--shadow), inset 0 0 34px rgba(0,234,255,.015);
      overflow: hidden;
      animation: cardIn .45s ease both;
    }
    .panel::before, .kpi::before {
      content: "";
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(0,234,255,.035), transparent 34%, rgba(122,92,255,.02));
      pointer-events: none;
    }
    .panel::after, .kpi::after {
      content: "";
      position: absolute; width: 44px; height: 12px; top: -1px; left: -1px;
      border-top: 1px solid rgba(0,234,255,.75);
      border-left: 1px solid rgba(0,234,255,.75);
      pointer-events: none;
    }

    .kpi { min-height: 152px; padding: 16px; }
    .kpi-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .kpi-title { color: #71819a; font: 700 9px/1 "JetBrains Mono", monospace; letter-spacing: .12em; }
    .mini-led { width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 10px currentColor; }
    .kpi-value { margin-top: 18px; font: 700 clamp(25px, 2.5vw, 38px)/1 Orbitron, sans-serif; letter-spacing: -.03em; }
    .kpi-sub { margin-top: 8px; color: var(--muted); font: 500 9px/1.3 "JetBrains Mono", monospace; }
    .spark { width: 100%; height: 32px; margin-top: 10px; display: block; }
    .spark polyline { fill: none; stroke: var(--cyan); stroke-width: 2; vector-effect: non-scaling-stroke; filter: drop-shadow(0 0 5px rgba(0,234,255,.35)); }

    .main-grid { grid-template-columns: repeat(12, minmax(0, 1fr)); }
    .span-3 { grid-column: span 3; }
    .span-4 { grid-column: span 4; }
    .span-5 { grid-column: span 5; }
    .span-6 { grid-column: span 6; }
    .span-7 { grid-column: span 7; }
    .span-8 { grid-column: span 8; }
    .span-12 { grid-column: span 12; }

    .panel { min-height: 220px; }
    .panel-head {
      min-height: 48px; padding: 14px 16px 11px;
      border-bottom: 1px solid rgba(255,255,255,.055);
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      position: relative; z-index: 1;
    }
    .panel-title { display: flex; align-items: center; gap: 9px; font: 700 10px/1 "JetBrains Mono", monospace; letter-spacing: .12em; color: #d2f7fa; }
    .panel-title i { color: var(--cyan); width: 15px; height: 15px; }
    .panel-tag { color: #65758b; font: 600 8px/1 "JetBrains Mono", monospace; letter-spacing: .1em; }
    .panel-body { padding: 15px; position: relative; z-index: 1; }

    .chart-wrap { height: 245px; }
    .chart-wrap.small { height: 210px; }
    canvas { max-width: 100%; }

    .gauge-wrap { display: grid; place-items: center; min-height: 220px; }
    .gauge {
      width: 178px; aspect-ratio: 1; border-radius: 50%;
      display: grid; place-items: center;
      background: conic-gradient(var(--green) calc(var(--value) * 1%), rgba(255,255,255,.05) 0);
      position: relative;
      box-shadow: 0 0 32px rgba(0,255,157,.09);
    }
    .gauge::before {
      content: "";
      width: 132px; aspect-ratio: 1; border-radius: 50%;
      background: radial-gradient(circle at 50% 35%, #111827, #060a11 70%);
      border: 1px solid rgba(255,255,255,.08);
      box-shadow: inset 0 0 28px rgba(0,234,255,.04);
    }
    .gauge-content { position: absolute; text-align: center; }
    .gauge-number { font: 800 42px/1 Orbitron, sans-serif; }
    .gauge-label { margin-top: 8px; font: 700 10px/1 "JetBrains Mono", monospace; letter-spacing: .13em; color: var(--green); }

    .metric-list { display: grid; gap: 9px; }
    .metric-row {
      display: grid; grid-template-columns: minmax(110px, 1fr) minmax(90px, auto);
      gap: 12px; align-items: center; padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,.045);
    }
    .metric-row:last-child { border-bottom: 0; }
    .metric-name { color: #71819a; font: 600 9px/1.35 "JetBrains Mono", monospace; letter-spacing: .07em; text-transform: uppercase; }
    .metric-value { text-align: right; font: 600 10px/1.35 "JetBrains Mono", monospace; overflow-wrap: anywhere; }
    .metric-value.accent { color: var(--cyan); }

    .tip {
      display: inline-grid; place-items: center;
      width: 14px; height: 14px; margin-left: 5px; border-radius: 50%;
      border: 1px solid rgba(0,234,255,.24); color: var(--cyan);
      font: 700 8px/1 sans-serif; cursor: help; position: relative;
    }
    .tip:hover::after, .tip:focus::after {
      content: attr(data-tip);
      position: absolute; left: 50%; bottom: calc(100% + 9px); transform: translateX(-50%);
      width: max-content; max-width: 230px; padding: 8px 10px; z-index: 200;
      border: 1px solid rgba(0,234,255,.22); border-radius: 8px;
      background: #070c14; color: #b9c8d7;
      font: 500 10px/1.45 Inter, sans-serif; letter-spacing: 0;
      box-shadow: 0 12px 28px rgba(0,0,0,.45);
    }

    .bar-row { margin-bottom: 10px; }
    .bar-top { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 5px; font: 600 9px/1 "JetBrains Mono", monospace; }
    .bar-track { height: 7px; border-radius: 999px; background: rgba(255,255,255,.05); overflow: hidden; }
    .bar-fill { height: 100%; border-radius: inherit; width: 0%; background: linear-gradient(90deg, var(--cyan), var(--green)); box-shadow: 0 0 12px rgba(0,234,255,.25); transition: width .6s cubic-bezier(.2,.8,.2,1), background .2s ease; }

    .core-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; max-height: 300px; overflow: auto; padding-right: 4px; }
    .core-card { padding: 10px; border: 1px solid rgba(255,255,255,.055); border-radius: 10px; background: rgba(255,255,255,.018); }

    .alert-list, .activity, .terminal { display: grid; gap: 7px; }
    .alert {
      display: flex; align-items: flex-start; gap: 9px;
      border: 1px solid rgba(255,255,255,.05); border-radius: 9px; padding: 9px 10px;
      font: 600 9px/1.5 "JetBrains Mono", monospace;
      background: rgba(255,255,255,.015);
    }
    .alert.ok { color: #9fffd6; }
    .alert.warning { color: #ffe28a; border-color: rgba(255,212,59,.12); }
    .alert.critical { color: #ff9caf; border-color: rgba(255,55,95,.15); }

    .terminal {
      background: #02050a; border: 1px solid rgba(0,255,157,.12); border-radius: 10px;
      padding: 14px; min-height: 220px; max-height: 280px; overflow: auto;
      font: 500 10px/1.8 "JetBrains Mono", monospace;
      color: #7bffca;
      box-shadow: inset 0 0 28px rgba(0,255,157,.025);
    }
    .terminal .muted { color: #65758b; }
    .terminal .cyan { color: var(--cyan); }
    .terminal .yellow { color: var(--yellow); }

    .resource-matrix { display: grid; gap: 11px; }
    .matrix-row { display: grid; grid-template-columns: 62px 1fr 60px; gap: 10px; align-items: center; font: 600 9px/1 "JetBrains Mono", monospace; }
    .segbar { display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; }
    .seg { height: 9px; border-radius: 2px; background: rgba(255,255,255,.05); }
    .seg.on { background: var(--cyan); box-shadow: 0 0 8px rgba(0,234,255,.22); }

    .orbit {
      width: min(300px, 82vw); aspect-ratio: 1; margin: 0 auto; position: relative;
      border-radius: 50%; border: 1px solid rgba(0,234,255,.11);
      background: radial-gradient(circle, rgba(0,234,255,.055), transparent 60%);
    }
    .orbit::before, .orbit::after {
      content: ""; position: absolute; border-radius: 50%; inset: 15%;
      border: 1px dashed rgba(122,92,255,.20);
      animation: orbit 18s linear infinite;
    }
    .orbit::after { inset: 30%; border-color: rgba(0,255,157,.16); animation: orbitReverse 14s linear infinite; }
    .orbit-core {
      position: absolute; inset: 38%; border-radius: 50%;
      display: grid; place-items: center; text-align: center;
      border: 1px solid rgba(0,234,255,.45);
      background: #071018; color: var(--cyan);
      font: 700 9px/1.3 Orbitron, sans-serif;
      box-shadow: 0 0 26px rgba(0,234,255,.14);
      z-index: 3;
    }
    .orb {
      position: absolute; width: 58px; height: 58px; border-radius: 50%;
      display: grid; place-items: center; text-align: center;
      background: #090f19; border: 1px solid rgba(0,234,255,.24);
      font: 700 8px/1.2 "JetBrains Mono", monospace; z-index: 4;
      box-shadow: 0 0 18px rgba(0,234,255,.08);
    }
    .orb.cpu { top: -5px; left: 50%; transform: translateX(-50%); }
    .orb.ram { right: -5px; top: 50%; transform: translateY(-50%); }
    .orb.net { bottom: -5px; left: 50%; transform: translateX(-50%); }
    .orb.node { left: -5px; top: 50%; transform: translateY(-50%); }
    .orb.loop { right: 8%; top: 8%; }

    .pulse-svg { width: 100%; height: 120px; }
    .pulse-line { fill: none; stroke: var(--cyan); stroke-width: 2; filter: drop-shadow(0 0 7px rgba(0,234,255,.55)); stroke-dasharray: 8 4; animation: dash 5s linear infinite; }
    @keyframes dash { to { stroke-dashoffset: -120; } }

    .network-flow {
      display: flex; align-items: center; justify-content: center; flex-wrap: wrap;
      gap: 8px; min-height: 130px;
    }
    .node-box {
      min-width: 95px; padding: 11px; text-align: center;
      border: 1px solid rgba(0,234,255,.18); border-radius: 10px;
      background: rgba(0,234,255,.025);
      font: 700 9px/1.4 "JetBrains Mono", monospace;
    }
    .arrow { color: var(--cyan); opacity: .7; }

    .cloud-lab { display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: stretch; }
    .dropbox {
      min-height: 170px; display: grid; place-items: center; text-align: center; padding: 18px;
      border: 1px dashed rgba(0,234,255,.2); border-radius: 12px;
      background: rgba(0,234,255,.018);
    }
    .dropbox h3 { margin: 0 0 6px; font: 700 12px Orbitron, sans-serif; letter-spacing: .1em; }
    .dropbox p { margin: 0 0 12px; color: var(--muted); font-size: 11px; }
    .vs { display: grid; place-items: center; color: var(--violet); font: 800 16px Orbitron, sans-serif; }

    .comparison { overflow-x: auto; }
    .comparison table { width: 100%; border-collapse: collapse; min-width: 600px; }
    .comparison th, .comparison td {
      padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.055);
      text-align: left; font: 500 10px/1.4 "JetBrains Mono", monospace;
    }
    .comparison th { color: #70829c; font-weight: 700; }

    .statusbar {
      position: fixed; left: 50%; bottom: 10px; transform: translateX(-50%);
      width: min(1200px, calc(100% - 28px)); z-index: 90;
      display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 14px;
      padding: 9px 14px; border: 1px solid rgba(0,234,255,.13); border-radius: 999px;
      background: rgba(4,7,12,.86); backdrop-filter: blur(16px);
      box-shadow: 0 0 24px rgba(0,0,0,.35);
      font: 700 8px/1 "JetBrains Mono", monospace; letter-spacing: .08em; color: #7d91a6;
    }
    .statusbar strong { color: var(--green); }

    .skeleton {
      color: transparent !important;
      border-radius: 5px;
      background: linear-gradient(90deg, rgba(255,255,255,.03), rgba(255,255,255,.09), rgba(255,255,255,.03));
      background-size: 200% 100%;
      animation: shimmer 1.4s linear infinite;
    }

    .presentation .secondary { display: none !important; }
    .presentation .kpis { grid-template-columns: repeat(4, 1fr); }
    .presentation .kpi { min-height: 190px; }
    .presentation .kpi-value { font-size: clamp(34px, 4vw, 56px); }
    .presentation .panel { min-height: 300px; }
    .presentation .topbar { position: relative; }

    .fx-off * { animation: none !important; transition-duration: .01ms !important; }
    .fx-off .scanline, .fx-off body::after, .fx-off .noise { display: none !important; }
    .fx-off .panel, .fx-off .kpi, .fx-off .topbar { box-shadow: none !important; }

    * { scrollbar-width: thin; scrollbar-color: rgba(0,234,255,.28) rgba(255,255,255,.025); }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: rgba(255,255,255,.02); }
    ::-webkit-scrollbar-thumb { background: rgba(0,234,255,.22); border-radius: 999px; }

    @media (max-width: 1500px) {
      .kpis { grid-template-columns: repeat(3, 1fr); }
      .topbar { grid-template-columns: 1fr auto; }
      .live-pill { justify-self: end; }
      .header-right { grid-column: 1 / -1; justify-content: space-between; }
    }

    @media (max-width: 1100px) {
      .span-3, .span-4, .span-5, .span-7, .span-8 { grid-column: span 6; }
      .topbar { position: relative; }
    }

    @media (max-width: 760px) {
      .shell { width: min(100% - 16px, 1900px); }
      .topbar { grid-template-columns: 1fr; margin-top: 8px; }
      .live-pill { justify-self: start; }
      .header-right { grid-column: auto; justify-content: flex-start; }
      .actions { justify-content: flex-start; }
      .host-chip, .clock-chip { min-width: 0; flex: 1 1 120px; }
      .kpis { grid-template-columns: repeat(2, minmax(0,1fr)); }
      .span-3, .span-4, .span-5, .span-6, .span-7, .span-8, .span-12 { grid-column: 1 / -1; }
      .main-grid { grid-template-columns: 1fr; }
      .cloud-lab { grid-template-columns: 1fr; }
      .vs { min-height: 28px; }
      .statusbar { border-radius: 14px; justify-content: flex-start; }
      .kpi { min-height: 138px; }
    }

    @media (max-width: 460px) {
      .kpis { grid-template-columns: 1fr; }
      .brand-mark { display: none; }
      .btn span { display: none; }
      .btn { min-width: 36px; padding: 8px; }
      .kpi-value { font-size: 34px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: .01ms !important;
        scroll-behavior: auto !important;
      }
    }


    /* NEXUS OMEGA // V2 */
    :root { --accent: var(--cyan); --accent2: var(--green); --dangerGlow: rgba(255,55,95,.28); }
    html[data-theme="violet"] { --accent:#a855f7; --accent2:#00eaff; }
    html[data-theme="emerald"] { --accent:#00ff9d; --accent2:#00eaff; }
    html[data-theme="crimson"] { --accent:#ff375f; --accent2:#ffd43b; }
    .omega-grid { display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:12px; }
    .hyper-panel { position:relative; overflow:hidden; border:1px solid color-mix(in srgb, var(--accent) 28%, transparent); background:linear-gradient(180deg,rgba(10,16,28,.9),rgba(5,9,16,.76)); border-radius:16px; box-shadow:0 0 40px color-mix(in srgb,var(--accent) 8%,transparent), inset 0 0 30px rgba(255,255,255,.018); }
    .hyper-panel::before { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(120deg,transparent 0 44%,color-mix(in srgb,var(--accent) 5%,transparent) 50%,transparent 56%); transform:translateX(-120%); animation:holoSweep 9s ease-in-out infinite; }
    @keyframes holoSweep { 0%,72%{transform:translateX(-120%)} 100%{transform:translateX(120%)} }
    .omega-hero { grid-column:span 12; padding:18px; display:grid; grid-template-columns:1.3fr .7fr; gap:18px; align-items:center; min-height:210px; }
    .omega-title { font:800 clamp(22px,3vw,46px)/1 Orbitron,sans-serif; letter-spacing:.08em; margin:0; background:linear-gradient(90deg,#fff,var(--accent),var(--accent2)); -webkit-background-clip:text; color:transparent; }
    .omega-sub { margin:10px 0 0; color:#89a0b8; max-width:850px; font:500 11px/1.7 "JetBrains Mono",monospace; }
    .telemetry-tape { display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
    .tape-chip { padding:7px 10px; border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.025); border-radius:999px; font:700 8px/1 "JetBrains Mono",monospace; color:#97aabd; }
    .tape-chip strong { color:var(--accent); }
    .holo-core { width:170px; aspect-ratio:1; margin:auto; border-radius:50%; display:grid; place-items:center; position:relative; background:radial-gradient(circle, color-mix(in srgb,var(--accent) 16%,transparent), transparent 64%); }
    .holo-core::before,.holo-core::after { content:""; position:absolute; inset:12%; border-radius:50%; border:1px solid color-mix(in srgb,var(--accent) 42%,transparent); animation:orbit 9s linear infinite; box-shadow:0 0 28px color-mix(in srgb,var(--accent) 10%,transparent); }
    .holo-core::after { inset:27%; border-style:dashed; animation:orbitReverse 6s linear infinite; }
    .holo-core b { font:800 18px/1 Orbitron,sans-serif; color:var(--accent); text-align:center; z-index:2; text-shadow:0 0 18px color-mix(in srgb,var(--accent) 55%,transparent); }
    .omega-card { grid-column:span 4; min-height:220px; }
    .omega-card.wide { grid-column:span 8; }
    .omega-card.full { grid-column:span 12; }
    .omega-body { padding:16px; position:relative; z-index:2; }
    .link-row { display:grid; grid-template-columns:1fr auto auto; gap:8px; }
    .nexus-input,.nexus-select { width:100%; color:#e8f8ff; background:#050913; border:1px solid rgba(0,234,255,.14); border-radius:9px; padding:10px 11px; outline:none; font:600 10px/1 "JetBrains Mono",monospace; }
    .nexus-input:focus,.nexus-select:focus { border-color:var(--accent); box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 10%,transparent); }
    .live-link-state { margin-top:12px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; font:700 9px/1.4 "JetBrains Mono",monospace; color:#8093a8; }
    .live-link-state .ok { color:var(--green); } .live-link-state .bad{color:var(--red)}
    .twin-grid { display:grid; grid-template-columns:1fr auto 1fr; gap:12px; align-items:stretch; }
    .twin-node { border:1px solid rgba(255,255,255,.06); border-radius:13px; padding:14px; background:rgba(255,255,255,.018); min-height:185px; }
    .twin-name { display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:12px; font:800 10px/1 Orbitron,sans-serif; color:#dffcff; }
    .twin-metrics { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
    .mini-stat { padding:10px; border:1px solid rgba(255,255,255,.05); border-radius:10px; background:rgba(0,0,0,.15); }
    .mini-stat span { display:block; color:#6f8196; font:700 8px/1.3 "JetBrains Mono",monospace; }
    .mini-stat b { display:block; margin-top:6px; font:800 16px/1 Orbitron,sans-serif; }
    .versus { display:grid; place-items:center; font:900 14px Orbitron,sans-serif; color:var(--violet); }
    .intel-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:9px; }
    .intel { padding:11px; border-radius:11px; border:1px solid rgba(255,255,255,.055); background:rgba(255,255,255,.018); }
    .intel span { display:block; color:#718299; font:700 8px/1.3 "JetBrains Mono",monospace; }
    .intel b { display:block; margin-top:6px; font:800 17px/1 Orbitron,sans-serif; color:var(--accent); }
    .anomaly { margin-top:12px; padding:12px; border:1px solid rgba(255,255,255,.06); border-radius:11px; background:rgba(0,0,0,.14); }
    .anomaly strong { font:800 10px Orbitron,sans-serif; }
    .meter3 { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; margin-top:10px; }
    .meter3 i { height:5px; background:rgba(255,255,255,.05); border-radius:99px; }
    .meter3 i.on { background:var(--accent); box-shadow:0 0 9px color-mix(in srgb,var(--accent) 45%,transparent); }
    .command-hint { color:#5f7185; font:700 8px/1 "JetBrains Mono",monospace; margin-top:10px; }
    .command-backdrop { position:fixed; inset:0; z-index:12000; background:rgba(0,0,0,.62); backdrop-filter:blur(10px); display:none; place-items:start center; padding-top:12vh; }
    .command-backdrop.open { display:grid; }
    body.command-open { overflow:hidden; }
    .command-box { width:min(700px,calc(100% - 24px)); border:1px solid rgba(0,234,255,.24); border-radius:15px; background:#070b13; box-shadow:0 30px 90px rgba(0,0,0,.55),0 0 50px rgba(0,234,255,.08); overflow:hidden; }
    .command-box input { width:100%; border:0; border-bottom:1px solid rgba(255,255,255,.06); background:transparent; color:#fff; padding:16px; outline:none; font:600 12px "JetBrains Mono",monospace; }
    .command-list { max-height:360px; overflow:auto; padding:8px; }
    .command-item { display:flex; justify-content:space-between; gap:12px; padding:11px 12px; border-radius:9px; color:#a9bacb; font:600 10px "JetBrains Mono",monospace; }
    .command-item:hover,.command-item.active { background:color-mix(in srgb,var(--accent) 9%,transparent); color:#fff; outline:1px solid color-mix(in srgb,var(--accent) 22%,transparent); }
    .command-item { cursor:pointer; border:0; width:100%; background:transparent; text-align:left; }
    .command-empty { padding:18px 14px; color:#72879d; font:600 10px/1.5 "JetBrains Mono",monospace; text-align:center; }
    .command-help { display:flex; justify-content:space-between; gap:12px; padding:9px 14px; border-top:1px solid rgba(255,255,255,.05); color:#60758a; font:600 8px/1.3 "JetBrains Mono",monospace; }
    .toast-stack { position:fixed; right:18px; bottom:44px; z-index:13000; display:grid; gap:8px; width:min(360px,calc(100% - 28px)); pointer-events:none; }
    .toast { padding:11px 13px; border:1px solid color-mix(in srgb,var(--accent) 30%,transparent); border-radius:11px; background:rgba(4,9,16,.95); color:#dceaf5; box-shadow:0 18px 48px rgba(0,0,0,.35),0 0 24px color-mix(in srgb,var(--accent) 10%,transparent); font:600 9px/1.45 "JetBrains Mono",monospace; animation:cardIn .18s ease; }
    .toast.error { border-color:rgba(255,55,95,.42); color:#ffd6df; }
    .rec-dot { width:7px;height:7px;border-radius:50%;background:#596675;display:inline-block;margin-right:6px; }
    .recording .rec-dot { background:var(--red); box-shadow:0 0 12px var(--red); animation:pulse 1s infinite; }
    .theme-dots { display:flex; gap:7px; }
    .theme-dot { width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.14); padding:0; }
    .theme-dot[data-t="cyan"]{background:#00eaff}.theme-dot[data-t="violet"]{background:#a855f7}.theme-dot[data-t="emerald"]{background:#00ff9d}.theme-dot[data-t="crimson"]{background:#ff375f}
    .transport-badge { color:var(--accent); }
    .delta-up { color:var(--red)!important; } .delta-down { color:var(--green)!important; }
    @media(max-width:1100px){ .omega-card,.omega-card.wide{grid-column:span 6}.omega-hero{grid-template-columns:1fr}.holo-core{width:130px}.twin-grid{grid-template-columns:1fr}.versus{min-height:28px} }
    @media(max-width:760px){ .omega-grid{grid-template-columns:1fr}.omega-card,.omega-card.wide,.omega-card.full,.omega-hero{grid-column:1/-1}.link-row{grid-template-columns:1fr}.intel-grid{grid-template-columns:1fr 1fr} }


    /* ======================================================
       NEXUS OMEGA V3 // HYPERVISION VISUAL SYSTEM
       ====================================================== */
    :root {
      --neon-strength: .52;
      --theme-bg-a: #05070d;
      --theme-bg-b: #07111a;
      --theme-grid: rgba(0,234,255,.035);
      --readability: 1;
    }
    html[data-theme="cyan"] { --accent:#00eaff; --accent2:#00ff9d; --theme-bg-a:#04070c; --theme-bg-b:#07131b; --theme-grid:rgba(0,234,255,.045); }
    html[data-theme="violet"] { --accent:#b66cff; --accent2:#4de8ff; --theme-bg-a:#080510; --theme-bg-b:#130922; --theme-grid:rgba(182,108,255,.045); }
    html[data-theme="emerald"] { --accent:#00ff9d; --accent2:#5dffdc; --theme-bg-a:#030a08; --theme-bg-b:#071712; --theme-grid:rgba(0,255,157,.045); }
    html[data-theme="crimson"] { --accent:#ff3f6c; --accent2:#ff9d36; --theme-bg-a:#0d0407; --theme-bg-b:#1b080d; --theme-grid:rgba(255,63,108,.045); }
    html[data-theme="solar"] { --accent:#ffd43b; --accent2:#ff7a18; --theme-bg-a:#0c0902; --theme-bg-b:#1a1003; --theme-grid:rgba(255,212,59,.045); }

    html[data-neon="off"] { --neon-strength:0; }
    html[data-neon="soft"] { --neon-strength:.40; }
    html[data-neon="hyper"] { --neon-strength:1; }

    body {
      background:
        radial-gradient(circle at 12% 10%, color-mix(in srgb,var(--accent) 9%,transparent), transparent 25%),
        radial-gradient(circle at 88% 8%, color-mix(in srgb,var(--accent2) 8%,transparent), transparent 26%),
        radial-gradient(circle at 50% 82%, color-mix(in srgb,var(--accent) 4%,transparent), transparent 28%),
        linear-gradient(160deg,var(--theme-bg-a),var(--theme-bg-b) 58%,var(--theme-bg-a));
    }
    body::before {
      background-image:
        linear-gradient(var(--theme-grid) 1px, transparent 1px),
        linear-gradient(90deg,var(--theme-grid) 1px, transparent 1px);
    }
    .panel,.hyper-panel,.kpi,.topbar {
      box-shadow:
        0 0 calc(28px * var(--neon-strength)) color-mix(in srgb,var(--accent) calc(12% * var(--neon-strength)),transparent),
        inset 0 0 calc(22px * var(--neon-strength)) rgba(255,255,255,.018);
    }
    .brand h1,.panel-title,.omega-title,.gauge-number,.kpi-value,.holo-core b {
      text-shadow: 0 0 calc(16px * var(--neon-strength)) color-mix(in srgb,var(--accent) 65%,transparent);
    }
    .btn:hover,.theme-dot.active {
      border-color:var(--accent);
      box-shadow:0 0 calc(18px * var(--neon-strength)) color-mix(in srgb,var(--accent) 35%,transparent), inset 0 0 12px color-mix(in srgb,var(--accent) 7%,transparent);
    }
    html[data-neon="off"] .scanline, html[data-neon="off"] .noise { opacity:.08; }
    html[data-neon="off"] .hyper-panel::before { display:none; }

    .visual-control-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:12px; }
    .visual-control-grid.one-control { grid-template-columns:1fr; }
    .control-unit { padding:10px; border:1px solid rgba(255,255,255,.06); border-radius:11px; background:rgba(255,255,255,.018); }
    .control-unit label { display:block; color:#7f93a8; font:800 8px/1.2 "JetBrains Mono",monospace; letter-spacing:.08em; margin-bottom:7px; }
    .theme-dot[data-t="solar"]{background:linear-gradient(135deg,#ffd43b,#ff7a18)}
    .theme-dot.active { transform:scale(1.18); }

    .observation-mode { --readability:1.18; }
    .observation-mode .metric-name,.observation-mode .kpi-sub,.observation-mode .omega-sub,.observation-mode .panel-tag,.observation-mode .tape-chip,.observation-mode .chip-label { color:#b9c9d8 !important; }
    .observation-mode .panel,.observation-mode .hyper-panel,.observation-mode .kpi { background:rgba(6,11,19,.94); border-color:color-mix(in srgb,var(--accent) 34%,rgba(255,255,255,.08)); }
    .observation-mode .panel-title,.observation-mode .kpi-title { letter-spacing:.11em; }
    .observation-mode .secondary { opacity:1; }
    .observation-mode .chart-wrap { filter:contrast(1.08) saturate(1.08); }
    .observation-mode .statusbar { background:rgba(1,4,8,.96); border-color:color-mix(in srgb,var(--accent) 35%,transparent); }

    .focus-strip { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; margin:12px 0 4px; padding:11px 13px; border:1px solid color-mix(in srgb,var(--accent) 18%,transparent); border-radius:12px; background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 4%,transparent),rgba(255,255,255,.015)); }
    .focus-strip strong { color:var(--accent); font:800 9px Orbitron,sans-serif; letter-spacing:.08em; }
    .focus-strip span { color:#7e91a6; font:600 9px/1.5 "JetBrains Mono",monospace; }

    .task-manager { margin-top:18px; }
    .task-summary-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:9px; margin-bottom:12px; }
    .task-summary { padding:12px; border:1px solid rgba(255,255,255,.055); border-radius:11px; background:rgba(255,255,255,.018); }
    .task-summary span { display:block; color:#75899e; font:700 8px/1.25 "JetBrains Mono",monospace; }
    .task-summary b { display:block; margin-top:7px; color:var(--accent); font:800 17px/1 Orbitron,sans-serif; }
    .task-toolbar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:9px; margin-bottom:10px; }
    .task-tools { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .task-tools .nexus-input { width:min(300px,100%); }
    .task-tools .nexus-select { width:auto; min-width:180px; }
    .task-table-wrap { overflow:auto; border:1px solid rgba(255,255,255,.055); border-radius:12px; background:rgba(0,0,0,.14); }
    .task-table { width:100%; border-collapse:collapse; min-width:760px; }
    .task-table th,.task-table td { padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.045); text-align:left; font:600 9px/1.35 "JetBrains Mono",monospace; }
    .task-table th { position:sticky; top:0; z-index:2; background:#080d16; color:#7790a7; letter-spacing:.08em; }
    .task-table tbody tr { transition:.18s ease; }
    .task-table tbody tr:hover { background:color-mix(in srgb,var(--accent) 5%,transparent); }
    .task-table tbody tr.nexus-task { background:color-mix(in srgb,var(--accent) 7%,transparent); }
    .task-table .task-name { color:#dbeaf5; font-weight:800; }
    .task-table .nexus-badge { margin-left:7px; padding:2px 6px; border-radius:999px; color:var(--accent); border:1px solid color-mix(in srgb,var(--accent) 25%,transparent); font-size:7px; }
    .cpu-pill,.mem-pill { display:inline-flex; min-width:62px; justify-content:center; padding:4px 7px; border-radius:7px; border:1px solid rgba(255,255,255,.06); background:rgba(255,255,255,.02); }
    .task-note { color:#667b91; font:600 8px/1.6 "JetBrains Mono",monospace; margin-top:10px; }

    @media (max-width:760px) {
      .visual-control-grid,.task-summary-grid { grid-template-columns:1fr 1fr; }
    }
    @media (max-width:480px) {
      .visual-control-grid,.task-summary-grid { grid-template-columns:1fr; }
    }

  </style>
</head>
<body>
  <div class="noise"></div>
  <div class="scanline"></div>

  <div class="boot" id="bootScreen" aria-hidden="true">
    <div class="boot-panel">
      <div class="boot-brand">NEXUS BIOS v5.3 // OMEGA V3</div>
      <div class="boot-lines" id="bootLines">
        <div class="active">INICIALIZANDO NÚCLEO DO SISTEMA...</div>
        <div>MATRIZ DE CPU ............ <span class="ok">OK</span></div>
        <div>MATRIZ DE MEMÓRIA ......... <span class="ok">OK</span></div>
        <div>INTERFACE DE REDE ........ <span class="ok">OK</span></div>
        <div>RUNTIME NODE ............. <span class="ok">OK</span></div>
        <div>AMBIENTE DE NUVEM ........ <span class="ok">OK</span></div>
        <div>MOTOR DE TELEMETRIA ...... <span class="ok">ONLINE</span></div>
        <br>
        <div class="active">CARREGANDO NEXUS OS...</div>
      </div>
    </div>
  </div>

  <main class="shell" id="appShell">
    <div class="focus-strip" id="focusStrip">
      <strong>HYPERVISION V3 // CAMADA DE OBSERVAÇÃO</strong>
      <span>5 temas · layout responsivo nativo · neon adaptável · observação aprimorada · processos somente leitura</span>
    </div>
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark"><i data-lucide="cpu"></i></div>
        <div>
          <h1>NEXUS OS</h1>
          <p>OMEGA V3 // MATRIZ DE OBSERVABILIDADE EM TEMPO REAL</p>
        </div>
      </div>

      <div class="live-pill syncing" id="connectionPill">
        <span class="live-dot"></span>
        <span id="connectionText">SINCRONIZANDO</span>
      </div>

      <div class="header-right">
        <div class="host-chip">
          <span class="chip-label">MÁQUINA</span>
          <span class="chip-value skeleton" id="headerHost">carregando</span>
        </div>
        <div class="host-chip">
          <span class="chip-label">AMBIENTE</span>
          <span class="chip-value skeleton" id="headerProvider">carregando</span>
        </div>
        <div class="clock-chip">
          <span class="chip-label">HORA DO SISTEMA</span>
          <span class="chip-value" id="clock">--:--:--</span>
        </div>
        <div class="clock-chip">
          <span class="chip-label">DATA</span>
          <span class="chip-value" id="date">--/--/----</span>
        </div>
        <div class="actions">
          <button class="btn" id="refreshBtn" aria-label="Atualizar telemetria"><i data-lucide="refresh-cw"></i><span>ATUALIZAR</span></button>
          <button class="btn" id="fullscreenBtn" aria-label="Tela cheia"><i data-lucide="maximize"></i><span>TELA CHEIA</span></button>
          <button class="btn" id="presentationBtn" aria-label="Modo apresentação"><i data-lucide="presentation"></i><span>APRESENTAÇÃO</span></button>
          <button class="btn" id="fxBtn" aria-label="Alternar efeitos visuais"><i data-lucide="sparkles"></i><span>FX</span></button>
          <button class="btn" id="exportBtn" aria-label="Exportar relatório"><i data-lucide="download"></i><span>EXPORTAR</span></button>
          <button class="btn" id="copyBtn" aria-label="Copiar relatório"><i data-lucide="copy"></i><span>COPIAR</span></button>
          <button class="btn" id="commandBtn" aria-label="Paleta de comandos"><i data-lucide="command"></i><span>CTRL+K</span></button>
        </div>
      </div>
    </header>

    <div class="section-label">Visão geral do sistema</div>
    <section class="grid kpis">
      <article class="kpi">
        <div class="kpi-head"><span class="kpi-title">SAÚDE DO SISTEMA</span><span class="mini-led"></span></div>
        <div class="kpi-value skeleton" id="kpiHealth">000%</div>
        <div class="kpi-sub" id="kpiHealthSub">CALCULANDO</div>
        <svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline id="healthSpark" points="0,25 100,25"></polyline></svg>
      </article>
      <article class="kpi">
        <div class="kpi-head"><span class="kpi-title">CPU <span class="tip" tabindex="0" data-tip="Uso médio real dos cores entre duas amostras.">?</span></span><span class="mini-led"></span></div>
        <div class="kpi-value skeleton" id="kpiCpu">00%</div>
        <div class="kpi-sub" id="kpiCpuSub">CPU DO SISTEMA</div>
        <svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline id="cpuSpark" points="0,25 100,25"></polyline></svg>
      </article>
      <article class="kpi">
        <div class="kpi-head"><span class="kpi-title">MEMÓRIA <span class="tip" tabindex="0" data-tip="RAM usada = memória total menos memória livre.">?</span></span><span class="mini-led"></span></div>
        <div class="kpi-value skeleton" id="kpiMemory">00%</div>
        <div class="kpi-sub" id="kpiMemorySub">USO DA RAM</div>
        <svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline id="memorySpark" points="0,25 100,25"></polyline></svg>
      </article>
      <article class="kpi">
        <div class="kpi-head"><span class="kpi-title">TEMPO LIGADO <span class="tip" tabindex="0" data-tip="Tempo desde a inicialização do sistema operacional.">?</span></span><span class="mini-led"></span></div>
        <div class="kpi-value skeleton" id="kpiUptime">00D</div>
        <div class="kpi-sub" id="kpiUptimeSub">TEMPO LIGADO</div>
        <svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="0,22 20,22 32,18 46,20 62,12 74,16 100,9"></polyline></svg>
      </article>
      <article class="kpi">
        <div class="kpi-head"><span class="kpi-title">EVENT LOOP <span class="tip" tabindex="0" data-tip="Atraso médio do loop de eventos do Node.js.">?</span></span><span class="mini-led"></span></div>
        <div class="kpi-value skeleton" id="kpiLoop">0ms</div>
        <div class="kpi-sub" id="kpiLoopSub">LATÊNCIA</div>
        <svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline id="loopSpark" points="0,25 100,25"></polyline></svg>
      </article>
      <article class="kpi">
        <div class="kpi-head"><span class="kpi-title">REQUISIÇÕES HTTP</span><span class="mini-led"></span></div>
        <div class="kpi-value skeleton" id="kpiRequests">0</div>
        <div class="kpi-sub" id="kpiRequestsSub">TOTAL DE REQUISIÇÕES</div>
        <svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline id="httpSpark" points="0,25 100,25"></polyline></svg>
      </article>
    </section>


    <div class="section-label">Central de comando Nexus Omega</div>
    <section class="omega-grid">
      <article class="hyper-panel omega-hero">
        <div>
          <div class="panel-tag">NEXUS OS // MOTOR DE OBSERVABILIDADE OMEGA V3</div>
          <h2 class="omega-title">NÚCLEO HYPERVISION // GÊMEO DIGITAL</h2>
          <p class="omega-sub">Telemetria local em tempo real, inteligência de sessão, análise de folga de recursos e conexão direta com uma segunda instância NEXUS publicada no Render. Todos os números exibidos abaixo vêm de métricas reais disponíveis ao Node.js.</p>
          <div class="telemetry-tape">
            <span class="tape-chip">TRANSPORTE <strong id="transportChip">INICIALIZAÇÃO</strong></span>
            <span class="tape-chip">AMOSTRAS <strong id="sampleChip">0</strong></span>
            <span class="tape-chip">FOLGA CPU <strong id="cpuHeadroomChip">--%</strong></span>
            <span class="tape-chip">FOLGA RAM <strong id="ramHeadroomChip">--%</strong></span>
            <span class="tape-chip">ELU <strong id="eluChip">--%</strong></span>
            <span class="tape-chip">GC <strong id="gcChip">0</strong></span>
          </div>
        </div>
        <div class="holo-core"><b>NEXUS<br>Ω</b></div>
      </article>

      <article class="hyper-panel omega-card wide" id="nexusLinkPanel">
        <div class="panel-head"><div class="panel-title"><i data-lucide="link-2"></i>NEXUS LINK // PC ↔ RENDER</div><div class="panel-tag" id="remoteTag">DESCONECTADO</div></div>
        <div class="omega-body">
          <div class="link-row">
            <input class="nexus-input" id="remoteUrl" placeholder="https://seu-projeto.onrender.com" autocomplete="off" spellcheck="false">
            <button class="btn" id="connectRemoteBtn"><i data-lucide="radio-tower"></i><span>CONECTAR</span></button>
            <button class="btn" id="disconnectRemoteBtn"><i data-lucide="unlink"></i><span>DESCONECTAR</span></button>
          </div>
          <div class="live-link-state" id="remoteState">Cole a URL do seu Render para criar um gêmeo digital ao vivo. Execute esta tela localmente para comparar seu PC com o servidor.</div>
          <div class="twin-grid" style="margin-top:14px">
            <div class="twin-node"><div class="twin-name"><span>LOCAL / ATUAL</span><span id="localTwinProvider">--</span></div><div class="twin-metrics" id="localTwin"></div></div>
            <div class="versus">VS</div>
            <div class="twin-node"><div class="twin-name"><span>REMOTO / RENDER</span><span id="remoteTwinProvider">AGUARDANDO</span></div><div class="twin-metrics" id="remoteTwin"><div class="metric-name">NENHUM NÓ REMOTO CONECTADO</div></div></div>
          </div>
        </div>
      </article>

      <article class="hyper-panel omega-card">
        <div class="panel-head"><div class="panel-title"><i data-lucide="brain-circuit"></i>INTELIGÊNCIA DA SESSÃO</div><div class="panel-tag" id="anomalyTag">APRENDENDO</div></div>
        <div class="omega-body">
          <div class="intel-grid">
            <div class="intel"><span>CPU P95</span><b id="cpuP95">--%</b></div>
            <div class="intel"><span>RAM P95</span><b id="ramP95">--%</b></div>
            <div class="intel"><span>LOOP P95</span><b id="loopP95">--ms</b></div>
            <div class="intel"><span>SAÚDE MÉDIA</span><b id="healthAvg">--</b></div>
          </div>
          <div class="anomaly"><strong id="anomalyTitle">LINHA DE BASE</strong><div class="metric-name" id="anomalyText" style="margin-top:6px">Coletando amostras de telemetria.</div><div class="meter3" id="anomalyMeter"><i></i><i></i><i></i></div></div>
        </div>
      </article>

      <article class="hyper-panel omega-card">
        <div class="panel-head"><div class="panel-title"><i data-lucide="sliders-horizontal"></i>CONTROLES DA MISSÃO</div><div class="panel-tag">AO VIVO</div></div>
        <div class="omega-body">
          <div class="metric-name" style="margin-bottom:7px">PERFIL DE ATUALIZAÇÃO</div>
          <select class="nexus-select" id="profileSelect"><option value="1000">HIPER // 1s</option><option value="1500" selected>EQUILIBRADO // 1,5s</option><option value="3000">ECONÔMICO // 3s</option><option value="5000">SILENCIOSO // 5s</option></select>
          <div class="actions" style="margin-top:12px;justify-content:flex-start"><button class="btn" id="pauseBtn"><i data-lucide="pause"></i><span>PAUSAR</span></button><button class="btn" id="recordBtn"><span class="rec-dot"></span><span>GRAVAR</span></button><button class="btn" id="exportSessionBtn"><i data-lucide="file-down"></i><span>SESSÃO</span></button></div>
          <div class="visual-control-grid">
            <div class="control-unit">
              <label>TEMA DE CORES</label>
              <select class="nexus-select" id="themeSelect">
                <option value="cyan">CYBER CYAN</option>
                <option value="violet">QUANTUM VIOLET</option>
                <option value="emerald">MATRIX EMERALD</option>
                <option value="crimson">CRIMSON REACTOR</option>
                <option value="solar">SOLAR GOLD</option>
              </select>
            </div>
            <div class="control-unit">
              <label>INTENSIDADE DO NEON</label>
              <select class="nexus-select" id="neonSelect">
                <option value="soft">SUAVE</option>
                <option value="hyper">INTENSO</option>
                <option value="off">DESLIGADO</option>
              </select>
            </div>
          </div>
          <div class="actions" style="margin-top:10px;justify-content:flex-start">
            <button class="btn" id="observationBtn"><i data-lucide="scan-eye"></i><span>MODO OBSERVAÇÃO</span></button>
          </div>
          <div class="theme-dots" style="margin-top:14px">
            <button class="theme-dot" data-t="cyan" aria-label="Tema Cyber Cyan" title="Cyber Cyan"></button>
            <button class="theme-dot" data-t="violet" aria-label="Tema Quantum Violet" title="Quantum Violet"></button>
            <button class="theme-dot" data-t="emerald" aria-label="Tema Matrix Emerald" title="Matrix Emerald"></button>
            <button class="theme-dot" data-t="crimson" aria-label="Tema Crimson Reactor" title="Crimson Reactor"></button>
            <button class="theme-dot" data-t="solar" aria-label="Tema Solar Gold" title="Solar Gold"></button>
          </div>
          <div class="command-hint">CTRL+K abre a paleta de comandos do NEXUS.</div>
        </div>
      </article>

      <article class="hyper-panel omega-card wide">
        <div class="panel-head"><div class="panel-title"><i data-lucide="git-compare"></i>RADAR DO GÊMEO DIGITAL AO VIVO</div><div class="panel-tag">LOCAL VS REMOTO</div></div>
        <div class="omega-body"><div class="chart-wrap"><canvas id="liveComparisonChart"></canvas></div></div>
      </article>

      <article class="hyper-panel omega-card">
        <div class="panel-head"><div class="panel-title"><i data-lucide="microscope"></i>INTELIGÊNCIA DO RUNTIME</div><div class="panel-tag">V8 / LIBUV</div></div>
        <div class="omega-body metric-list" id="runtimeIntel"></div>
      </article>
    </section>

    <div class="section-label">Telemetria principal</div>
    <section class="grid main-grid">
      <article class="panel span-3">
        <div class="panel-head"><div class="panel-title"><i data-lucide="activity"></i>SAÚDE DO SISTEMA</div><div class="panel-tag">HEURÍSTICO</div></div>
        <div class="panel-body gauge-wrap">
          <div class="gauge" id="healthGauge" style="--value:0">
            <div class="gauge-content"><div class="gauge-number" id="healthGaugeValue">0</div><div class="gauge-label" id="healthGaugeLabel">SINCRONIZANDO</div></div>
          </div>
        </div>
      </article>

      <article class="panel span-5">
        <div class="panel-head"><div class="panel-title"><i data-lucide="cpu"></i>HISTÓRICO DE CPU</div><div class="panel-tag" id="cpuChartTag">60 AMOSTRAS</div></div>
        <div class="panel-body"><div class="chart-wrap"><canvas id="cpuChart"></canvas></div></div>
      </article>

      <article class="panel span-4">
        <div class="panel-head"><div class="panel-title"><i data-lucide="memory-stick"></i>HISTÓRICO DE MEMÓRIA</div><div class="panel-tag">AO VIVO</div></div>
        <div class="panel-body"><div class="chart-wrap"><canvas id="memoryChart"></canvas></div></div>
      </article>

      <article class="panel span-8">
        <div class="panel-head"><div class="panel-title"><i data-lucide="binary"></i>MATRIZ DE NÚCLEOS DA CPU</div><div class="panel-tag" id="coreCountTag">0 NÚCLEOS</div></div>
        <div class="panel-body"><div class="core-grid" id="coreGrid"></div></div>
      </article>

      <article class="panel span-4">
        <div class="panel-head"><div class="panel-title"><i data-lucide="orbit"></i>ÓRBITA DE RECURSOS</div><div class="panel-tag">MAPA VISUAL</div></div>
        <div class="panel-body">
          <div class="orbit">
            <div class="orbit-core">NEXUS<br>NÚCLEO</div>
            <div class="orb cpu" id="orbCpu">CPU<br>--%</div>
            <div class="orb ram" id="orbRam">RAM<br>--%</div>
            <div class="orb net" id="orbNet">REDE<br>--</div>
            <div class="orb node" id="orbNode">NODE<br>--%</div>
            <div class="orb loop" id="orbLoop">LOOP<br>--</div>
          </div>
        </div>
      </article>

      <article class="panel span-4">
        <div class="panel-head"><div class="panel-title"><i data-lucide="database"></i>DISTRIBUIÇÃO DE MEMÓRIA</div><div class="panel-tag">RAM</div></div>
        <div class="panel-body"><div class="chart-wrap small"><canvas id="memoryDonut"></canvas></div></div>
      </article>

      <article class="panel span-4">
        <div class="panel-head"><div class="panel-title"><i data-lucide="radar"></i>RADAR DO SISTEMA</div><div class="panel-tag">MAIOR = MELHOR</div></div>
        <div class="panel-body"><div class="chart-wrap small"><canvas id="systemRadar"></canvas></div></div>
      </article>

      <article class="panel span-4">
        <div class="panel-head"><div class="panel-title"><i data-lucide="zap"></i>PULSO DO SISTEMA</div><div class="panel-tag">SINAL DA CPU</div></div>
        <div class="panel-body">
          <svg class="pulse-svg" viewBox="0 0 600 120" preserveAspectRatio="none">
            <path class="pulse-line" id="pulsePath" d="M0,70 L600,70"></path>
          </svg>
          <div class="resource-matrix" id="resourceMatrix"></div>
        </div>
      </article>

      <article class="panel span-6">
        <div class="panel-head"><div class="panel-title"><i data-lucide="gauge"></i>DISTRIBUIÇÃO DA CPU</div><div class="panel-tag">NÚCLEOS</div></div>
        <div class="panel-body"><div class="chart-wrap"><canvas id="coreChart"></canvas></div></div>
      </article>

      <article class="panel span-6">
        <div class="panel-head"><div class="panel-title"><i data-lucide="waves"></i>CARGA MÉDIA</div><div class="panel-tag">NÃO É CPU %</div></div>
        <div class="panel-body"><div class="chart-wrap"><canvas id="loadChart"></canvas></div></div>
      </article>

      <article class="panel span-6">
        <div class="panel-head"><div class="panel-title"><i data-lucide="timer"></i>LATÊNCIA DO EVENT LOOP</div><div class="panel-tag" id="loopStatusTag">SINCRONIZANDO</div></div>
        <div class="panel-body"><div class="chart-wrap"><canvas id="loopChart"></canvas></div></div>
      </article>

      <article class="panel span-6">
        <div class="panel-head"><div class="panel-title"><i data-lucide="network"></i>TRÁFEGO HTTP</div><div class="panel-tag" id="httpTag">0 RPM</div></div>
        <div class="panel-body"><div class="chart-wrap"><canvas id="httpChart"></canvas></div></div>
      </article>
    </section>

    <div class="section-label">Runtime e infraestrutura</div>
    <section class="grid main-grid">
      <article class="panel span-4">
        <div class="panel-head"><div class="panel-title"><i data-lucide="server-cog"></i>IDENTIDADE DO SISTEMA</div><div class="panel-tag">MÁQUINA</div></div>
        <div class="panel-body metric-list" id="systemIdentity"></div>
      </article>

      <article class="panel span-4">
        <div class="panel-head"><div class="panel-title"><i data-lucide="braces"></i>RUNTIME NODE</div><div class="panel-tag">PROCESSO</div></div>
        <div class="panel-body metric-list" id="runtimeStack"></div>
      </article>

      <article class="panel span-4">
        <div class="panel-head"><div class="panel-title"><i data-lucide="cloud-cog"></i>AMBIENTE DE NUVEM</div><div class="panel-tag" id="cloudTag">DETECTANDO</div></div>
        <div class="panel-body metric-list" id="cloudPanel"></div>
      </article>

      <article class="panel span-6">
        <div class="panel-head"><div class="panel-title"><i data-lucide="memory-stick"></i>MEMÓRIA DO PROCESSO NODE</div><div class="panel-tag" id="processCpuTag">CPU --%</div></div>
        <div class="panel-body">
          <div class="metric-list" id="processMemoryBars"></div>
          <div class="chart-wrap small"><canvas id="nodeMemoryChart"></canvas></div>
        </div>
      </article>

      <article class="panel span-6">
        <div class="panel-head"><div class="panel-title"><i data-lucide="waypoints"></i>MATRIZ DE REDE</div><div class="panel-tag" id="primaryIpTag">IP PRINCIPAL</div></div>
        <div class="panel-body">
          <div class="network-flow" id="networkFlow"></div>
          <div class="metric-list" id="networkList"></div>
        </div>
      </article>

      <article class="panel span-4 secondary">
        <div class="panel-head"><div class="panel-title"><i data-lucide="folder-tree"></i>ARMAZENAMENTO DO PROJETO</div><div class="panel-tag">SOMENTE RAIZ LOCAL</div></div>
        <div class="panel-body">
          <div class="metric-list" id="projectMetrics"></div>
          <div class="chart-wrap small"><canvas id="projectDonut"></canvas></div>
        </div>
      </article>

      <article class="panel span-4">
        <div class="panel-head"><div class="panel-title"><i data-lucide="triangle-alert"></i>ALERTAS DO SISTEMA</div><div class="panel-tag">LIMITES</div></div>
        <div class="panel-body"><div class="alert-list" id="alertList"></div></div>
      </article>

      <article class="panel span-4">
        <div class="panel-head"><div class="panel-title"><i data-lucide="shield-check"></i>COMPONENTES DE SAÚDE</div><div class="panel-tag">PONTUAÇÃO</div></div>
        <div class="panel-body metric-list" id="healthComponents"></div>
      </article>

      <article class="panel span-4 secondary">
        <div class="panel-head"><div class="panel-title"><i data-lucide="radio"></i>FLUXO DE ATIVIDADE NEXUS</div><div class="panel-tag">EVENTOS AO VIVO</div></div>
        <div class="panel-body"><div class="terminal" id="activityStream"></div></div>
      </article>

      <article class="panel span-8 secondary">
        <div class="panel-head"><div class="panel-title"><i data-lucide="terminal"></i>NEXUS TERMINAL</div><div class="panel-tag">VISUAL SOMENTE LEITURA</div></div>
        <div class="panel-body"><div class="terminal" id="terminalLog"></div></div>
      </article>
    </section>

    <div class="section-label secondary">Laboratório de nuvem</div>
    <section class="grid main-grid secondary">
      <article class="panel span-12">
        <div class="panel-head"><div class="panel-title"><i data-lucide="git-compare-arrows"></i>LABORATÓRIO DE NUVEM</div><div class="panel-tag">COMPARAÇÃO DE RELATÓRIOS</div></div>
        <div class="panel-body">
          <div class="cloud-lab">
            <div class="dropbox">
              <div>
                <h3>AMBIENTE A</h3>
                <p id="envAStatus">Importe um relatório exportado pelo NEXUS.</p>
                <input type="file" id="fileA" accept="application/json,.json" hidden>
                <button class="btn" id="importABtn"><i data-lucide="upload"></i><span>IMPORTAR A</span></button>
              </div>
            </div>
            <div class="vs">VS</div>
            <div class="dropbox">
              <div>
                <h3>AMBIENTE B</h3>
                <p id="envBStatus">Importe um relatório exportado pelo NEXUS.</p>
                <input type="file" id="fileB" accept="application/json,.json" hidden>
                <button class="btn" id="importBBtn"><i data-lucide="upload"></i><span>IMPORTAR B</span></button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article class="panel span-7">
        <div class="panel-head"><div class="panel-title"><i data-lucide="table-2"></i>COMPARAÇÃO DE NUVEM</div><div class="panel-tag">OBSERVACIONAL</div></div>
        <div class="panel-body comparison" id="comparisonTable">
          <div class="metric-name">IMPORTE DOIS RELATÓRIOS PARA COMEÇAR.</div>
        </div>
      </article>

      <article class="panel span-5">
        <div class="panel-head"><div class="panel-title"><i data-lucide="radar"></i>RADAR DE COMPARAÇÃO</div><div class="panel-tag">AMOSTRA ÚNICA</div></div>
        <div class="panel-body">
          <div class="chart-wrap"><canvas id="comparisonRadar"></canvas></div>
          <p style="color:#64748b;font-size:9px;line-height:1.5;margin:8px 0 0;font-family:JetBrains Mono,monospace;">Métricas de uma única amostra são observacionais e não constituem uma comparação científica controlada.</p>
        </div>
      </article>
    </section>

    <div class="section-label">Gerenciador de tarefas // somente leitura</div>
    <section class="grid main-grid task-manager" id="taskManagerSection">
      <article class="panel span-12">
        <div class="panel-head">
          <div class="panel-title"><i data-lucide="list-tree"></i>GERENCIADOR DE TAREFAS NEXUS // OBSERVADOR DE PROCESSOS</div>
          <div class="panel-tag" id="taskModeTag">INICIALIZANDO</div>
        </div>
        <div class="panel-body">
          <div class="task-summary-grid">
            <div class="task-summary"><span>PROCESSOS VISÍVEIS</span><b id="taskCount">--</b></div>
            <div class="task-summary"><span>PID DO NEXUS</span><b id="taskNexusPid">--</b></div>
            <div class="task-summary"><span>INTERVALO</span><b id="taskRefresh">5.0s</b></div>
            <div class="task-summary"><span>FONTE</span><b id="taskSource" style="font-size:11px">--</b></div>
          </div>
          <div class="task-toolbar">
            <div>
              <div class="metric-name">MATRIZ DE PROCESSOS</div>
              <div class="task-note" id="taskStatus">Aguardando telemetria de processos do sistema operacional.</div>
            </div>
            <div class="task-tools">
              <input class="nexus-input" id="taskFilter" placeholder="FILTRAR POR NOME / PID" autocomplete="off">
              <select class="nexus-select" id="taskSort" aria-label="Ordenar processos">
                <option value="cpu">ORDENAR: CPU</option>
                <option value="memory">ORDENAR: MEMÓRIA</option>
                <option value="name">ORDENAR: NOME</option>
                <option value="pid">ORDENAR: PID</option>
              </select>
            </div>
          </div>
          <div class="task-table-wrap">
            <table class="task-table">
              <thead><tr><th>PROCESSO</th><th>PID</th><th>CPU</th><th>MEMÓRIA</th><th>RAM %</th><th>ESTADO</th></tr></thead>
              <tbody id="taskTableBody"><tr><td colspan="6">INICIALIZANDO OBSERVADOR DE PROCESSOS...</td></tr></tbody>
            </table>
          </div>
          <div class="task-note">SOMENTE LEITURA POR PROJETO // O painel não expõe endpoint para encerrar processos, executar shell ou aceitar comandos remotos. No Windows, o tempo de CPU é acumulado pelo processo; no Linux/Render, CPU % vem do snapshot do sistema.</div>
        </div>
      </article>
    </section>
  </main>

  <footer class="statusbar">
    <span><strong>NEXUS OMEGA V3 ONLINE</strong></span>
    <span id="statusApi">API SINCRONIZANDO</span>
    <span id="statusNode">NODE --</span>
    <span id="statusProvider">LOCAL / NUVEM</span>
    <span id="statusLatency">LATÊNCIA --ms</span>
    <span id="statusUptime">TEMPO LIGADO --</span>
  </footer>


  <div class="command-backdrop" id="commandPalette" aria-hidden="true">
    <div class="command-box">
      <input id="commandSearch" placeholder="Digite um comando do NEXUS…" autocomplete="off" aria-label="Buscar comando">
      <div class="command-list" id="commandList" role="listbox"></div>
      <div class="command-help"><span>↑ ↓ navegar · Enter executar</span><span>Esc fechar</span></div>
    </div>
  </div>
  <div class="toast-stack" id="toastStack" aria-live="polite" aria-atomic="true"></div>

  <script>
    (function () {
      "use strict";

      var state = {
        latest: null,
        latency: 0,
        history: {
          cpu: [], memory: [], loop: [], http: [], health: []
        },
        reports: { a: null, b: null },
        charts: {},
        remote: null,
        remoteLatency: 0,
        remoteUrl: localStorage.getItem("nexusRemoteUrl") || "",
        remoteTimer: null,
        paused: false,
        recording: false,
        records: [],
        sampleMs: Number(localStorage.getItem("nexusSampleMs")) || 1500,
        pollTimer: null,
        eventSource: null,
        transport: "BOOT",
        taskFilter: "",
        taskSort: localStorage.getItem("nexusTaskSort") || "cpu",
        neon: localStorage.getItem("nexusNeon") || "soft",
        observation: localStorage.getItem("nexusObservation") === "1"
      };

      var MAX_HISTORY = 60;
      var MAX_RECORDS = 600;

      function $(id) { return document.getElementById(id); }
      function clamp(v, min, max) {
        min = min === undefined ? 0 : min;
        max = max === undefined ? 100 : max;
        v = Number(v);
        if (!Number.isFinite(v)) return min;
        return Math.min(max, Math.max(min, v));
      }
      function fmt(n, digits) {
        digits = digits === undefined ? 1 : digits;
        n = Number(n);
        if (!Number.isFinite(n)) return "0";
        return n.toFixed(digits).replace(/\.0+$/, "");
      }
      function esc(value) {
        return String(value === undefined || value === null ? "N/A" : value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }
      function addHistory(list, value) {
        list.push(Number(value) || 0);
        if (list.length > MAX_HISTORY) list.shift();
      }
      function statusColor(value) {
        value = Number(value) || 0;
        if (value >= 90) return "#ff375f";
        if (value >= 75) return "#ffd43b";
        if (value >= 50) return "#a855f7";
        return "#00eaff";
      }
      function healthColor(score) {
        score = Number(score) || 0;
        if (score >= 90) return "#00ff9d";
        if (score >= 75) return "#00eaff";
        if (score >= 50) return "#ffd43b";
        return "#ff375f";
      }
      function nowTime() {
        return new Date().toLocaleTimeString("pt-BR", { hour12: false });
      }
      function setText(id, value) {
        var el = $(id);
        if (!el) return;
        el.textContent = value;
        el.classList.remove("skeleton");
      }
      function row(label, value, accent, tip) {
        var labelHtml = esc(label);
        if (tip) {
          labelHtml += ' <span class="tip" tabindex="0" data-tip="' + esc(tip) + '">?</span>';
        }
        return '<div class="metric-row"><div class="metric-name">' + labelHtml + '</div><div class="metric-value ' + (accent ? "accent" : "") + '">' + esc(value) + '</div></div>';
      }
      function bar(label, value, max, display, tip) {
        var pct = max > 0 ? clamp((Number(value) / Number(max)) * 100) : 0;
        var color = statusColor(pct);
        var tipHtml = tip ? ' <span class="tip" tabindex="0" data-tip="' + esc(tip) + '">?</span>' : "";
        return '<div class="bar-row"><div class="bar-top"><span>' + esc(label) + tipHtml + '</span><span>' + esc(display) + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div></div>';
      }

      function chartOptions(extra) {
        var base = {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 350 },
          interaction: { intersect: false, mode: "index" },
          plugins: {
            legend: { labels: { color: "#8c9bb5", boxWidth: 10, font: { family: "JetBrains Mono", size: 9 } } },
            tooltip: {
              backgroundColor: "rgba(5,8,15,.96)",
              borderColor: "rgba(0,234,255,.18)",
              borderWidth: 1,
              titleColor: "#ffffff",
              bodyColor: "#a9b8cb"
            }
          },
          scales: {
            x: {
              ticks: { display: false, color: "#64748b" },
              grid: { color: "rgba(255,255,255,.035)" },
              border: { color: "rgba(255,255,255,.06)" }
            },
            y: {
              beginAtZero: true,
              ticks: { color: "#64748b", font: { family: "JetBrains Mono", size: 9 } },
              grid: { color: "rgba(255,255,255,.035)" },
              border: { color: "rgba(255,255,255,.06)" }
            }
          }
        };
        return Object.assign(base, extra || {});
      }

      function createCharts() {
        if (!window.Chart) return;
        Chart.defaults.color = "#8290a5";
        Chart.defaults.font.family = "Inter";

        state.charts.cpu = new Chart($("cpuChart"), {
          type: "line",
          data: { labels: [], datasets: [{ label: "CPU %", data: [], borderColor: "#00eaff", backgroundColor: "rgba(0,234,255,.08)", fill: true, tension: .35, pointRadius: 0, borderWidth: 2 }] },
          options: chartOptions({ scales: { x: chartOptions().scales.x, y: Object.assign({}, chartOptions().scales.y, { suggestedMax: 100, max: 100 }) } })
        });

        state.charts.memory = new Chart($("memoryChart"), {
          type: "line",
          data: { labels: [], datasets: [{ label: "RAM %", data: [], borderColor: "#7a5cff", backgroundColor: "rgba(122,92,255,.08)", fill: true, tension: .35, pointRadius: 0, borderWidth: 2 }] },
          options: chartOptions({ scales: { x: chartOptions().scales.x, y: Object.assign({}, chartOptions().scales.y, { suggestedMax: 100, max: 100 }) } })
        });

        state.charts.memoryDonut = new Chart($("memoryDonut"), {
          type: "doughnut",
          data: { labels: ["USADA", "LIVRE"], datasets: [{ data: [0, 1], backgroundColor: ["#7a5cff", "rgba(255,255,255,.08)"], borderWidth: 0, hoverOffset: 3 }] },
          options: { responsive: true, maintainAspectRatio: false, cutout: "74%", plugins: { legend: { position: "bottom", labels: { color: "#8c9bb5", boxWidth: 10, font: { family: "JetBrains Mono", size: 9 } } } } }
        });

        state.charts.systemRadar = new Chart($("systemRadar"), {
          type: "radar",
          data: { labels: ["CPU", "MEMÓRIA", "RUNTIME", "EVENT LOOP", "API"], datasets: [{ label: "SAÚDE", data: [0,0,0,0,0], borderColor: "#00ff9d", backgroundColor: "rgba(0,255,157,.09)", pointBackgroundColor: "#00ff9d", pointRadius: 2 }] },
          options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { display: false }, angleLines: { color: "rgba(255,255,255,.07)" }, grid: { color: "rgba(255,255,255,.06)" }, pointLabels: { color: "#74869a", font: { family: "JetBrains Mono", size: 8 } } } }, plugins: { legend: { display: false } } }
        });

        state.charts.core = new Chart($("coreChart"), {
          type: "bar",
          data: { labels: [], datasets: [{ label: "NÚCLEO %", data: [], backgroundColor: "#00eaff", borderRadius: 4 }] },
          options: chartOptions({ indexAxis: "y", scales: { x: Object.assign({}, chartOptions().scales.y, { max: 100 }), y: chartOptions().scales.x }, plugins: { legend: { display: false } } })
        });

        state.charts.load = new Chart($("loadChart"), {
          type: "bar",
          data: { labels: ["1 MIN", "5 MIN", "15 MIN"], datasets: [{ label: "CARGA MÉDIA", data: [0,0,0], backgroundColor: ["#00eaff","#7a5cff","#a855f7"], borderRadius: 5 }] },
          options: chartOptions({ plugins: { legend: { display: false } } })
        });

        state.charts.loop = new Chart($("loopChart"), {
          type: "line",
          data: { labels: [], datasets: [{ label: "EVENT LOOP ms", data: [], borderColor: "#ffd43b", backgroundColor: "rgba(255,212,59,.06)", fill: true, tension: .3, pointRadius: 0, borderWidth: 2 }] },
          options: chartOptions()
        });

        state.charts.http = new Chart($("httpChart"), {
          type: "bar",
          data: { labels: [], datasets: [{ label: "REQUISIÇÕES / AMOSTRA", data: [], backgroundColor: "#00ff9d", borderRadius: 3 }] },
          options: chartOptions({ plugins: { legend: { display: false } } })
        });

        state.charts.nodeMemory = new Chart($("nodeMemoryChart"), {
          type: "bar",
          data: { labels: ["RSS","HEAP USADO","HEAP TOTAL","EXTERNO","ARRAY BUF"], datasets: [{ label: "MB", data: [0,0,0,0,0], backgroundColor: ["#00eaff","#00ff9d","#7a5cff","#a855f7","#ffd43b"], borderRadius: 5 }] },
          options: chartOptions({ plugins: { legend: { display: false } } })
        });

        state.charts.project = new Chart($("projectDonut"), {
          type: "doughnut",
          data: { labels: ["JS","JSON","MD","OUTROS"], datasets: [{ data: [0,0,0,1], backgroundColor: ["#00eaff","#7a5cff","#00ff9d","rgba(255,255,255,.08)"], borderWidth: 0 }] },
          options: { responsive: true, maintainAspectRatio: false, cutout: "72%", plugins: { legend: { position: "bottom", labels: { color: "#8c9bb5", boxWidth: 10, font: { family: "JetBrains Mono", size: 9 } } } } }
        });

        state.charts.comparison = new Chart($("comparisonRadar"), {
          type: "radar",
          data: {
            labels: ["CPU LIVRE","RAM LIVRE","SAÚDE","LOOP","API"],
            datasets: [
              { label: "AMBIENTE A", data: [0,0,0,0,0], borderColor: "#00eaff", backgroundColor: "rgba(0,234,255,.06)", pointRadius: 2 },
              { label: "AMBIENTE B", data: [0,0,0,0,0], borderColor: "#a855f7", backgroundColor: "rgba(168,85,247,.05)", pointRadius: 2 }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { display: false }, angleLines: { color: "rgba(255,255,255,.07)" }, grid: { color: "rgba(255,255,255,.06)" }, pointLabels: { color: "#74869a", font: { family: "JetBrains Mono", size: 8 } } } } }
        });

        state.charts.liveComparison = new Chart($("liveComparisonChart"), {
          type: "radar",
          data: {
            labels: ["FOLGA CPU","FOLGA RAM","SAÚDE","ESTABILIDADE LOOP","QUALIDADE API"],
            datasets: [
              { label: "NÓ ATUAL", data: [0,0,0,0,0], borderColor: "#00eaff", backgroundColor: "rgba(0,234,255,.07)", pointBackgroundColor: "#00eaff", pointRadius: 3 },
              { label: "NÓ REMOTO", data: [0,0,0,0,0], borderColor: "#a855f7", backgroundColor: "rgba(168,85,247,.06)", pointBackgroundColor: "#a855f7", pointRadius: 3 }
            ]
          },
          options: { responsive:true, maintainAspectRatio:false, scales:{ r:{ min:0,max:100,ticks:{display:false},angleLines:{color:"rgba(255,255,255,.08)"},grid:{color:"rgba(255,255,255,.06)"},pointLabels:{color:"#8ba0b7",font:{family:"JetBrains Mono",size:9}}}}, plugins:{legend:{labels:{color:"#9aacc0",boxWidth:10,font:{family:"JetBrains Mono",size:9}}}} }
        });
      }

      function chartUpdate(chart, labels, data) {
        if (!chart) return;
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update("none");
      }

      function sparkPoints(values) {
        if (!values.length) return "0,25 100,25";
        var width = 100;
        var height = 28;
        var max = Math.max.apply(null, values.concat([1]));
        var min = Math.min.apply(null, values);
        var range = Math.max(1, max - min);
        return values.map(function (v, i) {
          var x = values.length === 1 ? 0 : (i / (values.length - 1)) * width;
          var y = height - ((v - min) / range) * 23;
          return x.toFixed(1) + "," + y.toFixed(1);
        }).join(" ");
      }

      function setConnection(mode) {
        var pill = $("connectionPill");
        var text = $("connectionText");
        if (!pill || !text) return;
        var normalized = String(mode || "SYNCING").toUpperCase();
        var aliases = {
          "SINCRONIZANDO":"SYNCING",
          "RECONECTANDO":"RECONNECTING",
          "DEGRADADO":"DEGRADED",
          "CONEXÃO PERDIDA":"CONNECTION LOST",
          "CONEXAO PERDIDA":"CONNECTION LOST"
        };
        normalized = aliases[normalized] || normalized;
        var labels = {
          LIVE: "TELEMETRIA AO VIVO",
          SYNCING: "SINCRONIZANDO",
          RECONNECTING: "RECONECTANDO",
          DEGRADED: "DEGRADADO",
          "CONNECTION LOST": "CONEXÃO PERDIDA"
        };
        pill.classList.remove("syncing", "lost");
        if (normalized === "SYNCING" || normalized === "RECONNECTING") pill.classList.add("syncing");
        else if (normalized !== "LIVE") pill.classList.add("lost");
        text.textContent = labels[normalized] || String(mode || "SINCRONIZANDO");
      }

      function renderCores(cpu) {
        $("coreCountTag").textContent = cpu.cores + " NÚCLEOS LÓGICOS";
        $("coreGrid").innerHTML = cpu.perCore.map(function (value, index) {
          var color = statusColor(value);
          return '<div class="core-card"><div class="bar-top"><span>NÚCLEO ' + String(index + 1).padStart(2, "0") + '</span><span>' + fmt(value, 1) + '%</span></div><div class="bar-track"><div class="bar-fill" style="width:' + clamp(value) + '%;background:' + color + '"></div></div></div>';
        }).join("");

        if (state.charts.core) {
          state.charts.core.data.labels = cpu.perCore.map(function (_, i) { return "NÚCLEO " + String(i + 1).padStart(2, "0"); });
          state.charts.core.data.datasets[0].data = cpu.perCore;
          state.charts.core.data.datasets[0].backgroundColor = cpu.perCore.map(statusColor);
          state.charts.core.update("none");
        }
      }

      function renderIdentity(data) {
        var s = data.system;
        $("systemIdentity").innerHTML =
          row("NOME DA MÁQUINA", s.hostname, true) +
          row("TIPO DO SO", s.type) +
          row("PLATAFORMA", s.platform) +
          row("KERNEL", s.release, false, "Versão do kernel/sistema reportada pelo Node.js.") +
          row("ARQUITETURA", s.architecture, false, "Arquitetura do processo, como x64 ou arm64.") +
          row("ENDIANNESS", s.endianness, false, "Ordem de bytes usada pela arquitetura.") +
          row("MODELO DA CPU", s.cpuModel) +
          row("NÚCLEOS DA CPU", s.cpuCores) +
          row("PARALELISMO DISPONÍVEL", s.availableParallelism || s.cpuCores) +
          row("CLOCK DA CPU", s.cpuSpeedMHz + " MHz") +
          row("VERSÃO DO NODE", s.nodeVersion) +
          row("VERSÃO DO V8", s.v8Version, false, "Motor JavaScript usado pelo Node.js.") +
          row("PID / PPID", s.pid + " / " + s.ppid) +
          row("PASTA TEMPORÁRIA", s.tempDirectory);

        var r = data.runtime;
        $("runtimeStack").innerHTML =
          row("NODE.JS", r.node, true) +
          row("V8", r.v8, false, "Motor JavaScript embutido no Node.js.") +
          row("LIBUV", r.uv, false, "Biblioteca que implementa event loop e I/O assíncrono.") +
          row("OPENSSL", r.openssl) +
          row("ZLIB", r.zlib) +
          row("TÍTULO DO PROCESSO", r.processTitle) +
          row("TEMPO DO PROCESSO", r.uptimeFormatted) +
          row("CPU DO PROCESSO NODE", fmt(data.cpu.processUsage, 2) + "%");
      }

      function renderCloud(data) {
        var e = data.environment;
        $("cloudTag").textContent = e.provider;
        var renderExtra = e.render ?
          row("SERVIÇO RENDER", e.render.serviceName) +
          row("TIPO DE SERVIÇO", e.render.serviceType) +
          row("CPU DO RENDER", e.render.cpuCount) +
          row("CONCORRÊNCIA WEB", e.render.webConcurrency) +
          row("INSTÂNCIA", e.render.instanceId) : "";
        var deploymentLabel = String(e.deploymentMode || "N/A")
          .replace("LOCAL MACHINE", "MÁQUINA LOCAL")
          .replace("RENDER CLOUD", "NUVEM RENDER")
          .replace("RAILWAY CLOUD", "NUVEM RAILWAY")
          .replace("FLY.IO CLOUD", "NUVEM FLY.IO")
          .replace("HEROKU CLOUD", "NUVEM HEROKU")
          .replace("GENERIC CLOUD", "NUVEM GENÉRICA");
        $("cloudPanel").innerHTML =
          row("PROVEDOR", e.provider, true) +
          row("MODO DE EXECUÇÃO", deploymentLabel) +
          row("REGIÃO", e.region) +
          row("PORT", e.port) +
          row("NODE_ENV", e.nodeEnv) +
          row("NOME DA MÁQUINA", e.hostname) +
          row("PLATAFORMA", e.platform) +
          row("ARQUITETURA", e.architecture) +
          row("VERSÃO DO NODE", e.nodeVersion) + renderExtra;
      }

      function renderMemory(data) {
        var m = data.memory;
        var p = m.process;
        var heapMax = Math.max(p.heapTotal, p.rss, 1);

        $("processCpuTag").textContent = "CPU " + fmt(data.cpu.processUsage, 2) + "%";
        $("processMemoryBars").innerHTML =
          bar("RSS", p.rss, Math.max(m.total, p.rss), p.rssFormatted, "Memória residente total do processo.") +
          bar("HEAP USADO", p.heapUsed, heapMax, p.heapUsedFormatted, "Heap JavaScript atualmente utilizado.") +
          bar("HEAP TOTAL", p.heapTotal, heapMax, p.heapTotalFormatted, "Heap JavaScript reservado pelo V8.") +
          bar("EXTERNO", p.external, heapMax, p.externalFormatted) +
          bar("ARRAY BUFFERS", p.arrayBuffers, heapMax, p.arrayBuffersFormatted);

        if (state.charts.nodeMemory) {
          state.charts.nodeMemory.data.datasets[0].data = [
            p.rss / 1048576,
            p.heapUsed / 1048576,
            p.heapTotal / 1048576,
            p.external / 1048576,
            p.arrayBuffers / 1048576
          ];
          state.charts.nodeMemory.update("none");
        }

        if (state.charts.memoryDonut) {
          state.charts.memoryDonut.data.datasets[0].data = [m.used, m.free];
          state.charts.memoryDonut.update("none");
        }
      }

      function renderNetwork(data) {
        var n = data.network;
        $("primaryIpTag").textContent = "IP PRINCIPAL " + n.primaryIp;

        var cloud = data.environment.provider !== "LOCAL" ? data.environment.provider + " / NUVEM" : "LOCALHOST";
        $("networkFlow").innerHTML =
          '<div class="node-box">NAVEGADOR</div><div class="arrow">→</div>' +
          '<div class="node-box">' + esc(cloud) + '</div><div class="arrow">→</div>' +
          '<div class="node-box">NODE.JS</div><div class="arrow">→</div>' +
          '<div class="node-box">EXPRESS</div><div class="arrow">→</div>' +
          '<div class="node-box">' + esc(data.system.platform.toUpperCase()) + '</div>';

        var rows = row("IP PRINCIPAL", n.primaryIp, true) + row("INTERFACE PRINCIPAL", n.primaryInterface);
        n.interfaces.slice(0, 7).forEach(function (item) {
          rows += row(item.interface + " " + item.family, item.address + " · " + item.cidr);
        });
        $("networkList").innerHTML = rows;
      }

      function renderProject(project) {
        $("projectMetrics").innerHTML =
          row("ARQUIVOS DO PROJETO", project.files, true) +
          row("DIRETÓRIOS", project.directories) +
          row("TAMANHO DO PROJETO", project.sizeFormatted) +
          row("ARQUIVOS JS", project.jsFiles) +
          row("ARQUIVOS JSON", project.jsonFiles) +
          row("ARQUIVOS MD", project.mdFiles);

        var other = Math.max(0, project.files - project.jsFiles - project.jsonFiles - project.mdFiles);
        if (state.charts.project) {
          state.charts.project.data.datasets[0].data = [project.jsFiles, project.jsonFiles, project.mdFiles, other];
          state.charts.project.update("none");
        }
      }

      function renderAlerts(alerts) {
        $("alertList").innerHTML = alerts.map(function (item) {
          var symbol = item.level === "ok" ? "✓" : item.level === "warning" ? "⚠" : "✕";
          return '<div class="alert ' + esc(item.level) + '"><span>' + symbol + '</span><span>' + esc(item.message) + '</span></div>';
        }).join("");
      }

      function renderHealth(data) {
        var h = data.health;
        var color = healthColor(h.score);
        setText("kpiHealth", h.score + "%");
        setText("kpiHealthSub", h.label);
        $("healthGauge").style.setProperty("--value", h.score);
        $("healthGauge").style.background = "conic-gradient(" + color + " " + h.score + "%, rgba(255,255,255,.05) 0)";
        $("healthGaugeValue").textContent = h.score;
        $("healthGaugeLabel").textContent = h.label;
        $("healthGaugeLabel").style.color = color;

        $("healthComponents").innerHTML =
          bar("SAÚDE DA CPU", h.components.cpu, 100, h.components.cpu + "%") +
          bar("SAÚDE DA MEMÓRIA", h.components.memory, 100, h.components.memory + "%") +
          bar("SAÚDE DO RUNTIME", h.components.runtime, 100, h.components.runtime + "%") +
          bar("EVENT LOOP", h.components.eventLoop, 100, h.components.eventLoop + "%") +
          bar("SAÚDE DA REDE", h.components.network, 100, h.components.network + "%") +
          bar("SAÚDE DA API", h.components.api, 100, h.components.api + "%");

        if (state.charts.systemRadar) {
          state.charts.systemRadar.data.datasets[0].data = [
            h.components.cpu,
            h.components.memory,
            h.components.runtime,
            h.components.eventLoop,
            h.components.api
          ];
          state.charts.systemRadar.update("none");
        }
      }

      function renderHttp(data) {
        var h = data.http;
        $("httpTag").textContent = h.requestsPerMinute + " RPM";
        setText("kpiRequests", String(h.totalRequests));
        setText("kpiRequestsSub", h.requestsPerMinute + " REQ/MIN · " + h.avgResponseTimeMs + "ms MÉDIA");

        if ($("httpStatusBreakdown")) $("httpStatusBreakdown").remove();

        var alertList = $("alertList");
        var block = document.createElement("div");
        block.id = "httpStatusBreakdown";
        block.style.marginTop = "10px";
        block.innerHTML =
          '<div class="resource-matrix">' +
          matrixRow("2XX", Math.min(100, h.status["2xx"]), h.status["2xx"]) +
          matrixRow("3XX", Math.min(100, h.status["3xx"]), h.status["3xx"]) +
          matrixRow("4XX", Math.min(100, h.status["4xx"]), h.status["4xx"]) +
          matrixRow("5XX", Math.min(100, h.status["5xx"]), h.status["5xx"]) +
          '</div>';
        alertList.parentElement.appendChild(block);
      }

      function matrixRow(label, percent, display) {
        var on = Math.round(clamp(percent) / 10);
        var segments = "";
        for (var i = 0; i < 10; i += 1) {
          segments += '<span class="seg ' + (i < on ? "on" : "") + '"></span>';
        }
        return '<div class="matrix-row"><span>' + esc(label) + '</span><span class="segbar">' + segments + '</span><span>' + esc(display) + '</span></div>';
      }

      function renderResourceMatrix(data) {
        $("resourceMatrix").innerHTML =
          matrixRow("CPU", data.cpu.usage, fmt(data.cpu.usage, 1) + "%") +
          matrixRow("RAM", data.memory.usage, fmt(data.memory.usage, 1) + "%") +
          matrixRow("NODE", data.cpu.processUsage, fmt(data.cpu.processUsage, 1) + "%") +
          matrixRow("LOOP", clamp(data.eventLoop.meanMs), data.eventLoop.label) +
          matrixRow("API", clamp(state.latency), fmt(state.latency, 0) + "ms");

        $("orbCpu").innerHTML = "CPU<br>" + fmt(data.cpu.usage, 0) + "%";
        $("orbRam").innerHTML = "RAM<br>" + fmt(data.memory.usage, 0) + "%";
        $("orbNet").innerHTML = "REDE<br>" + (data.network.primaryIp === "N/A" ? "N/A" : "OK");
        $("orbNode").innerHTML = "NODE<br>" + fmt(data.cpu.processUsage, 0) + "%";
        $("orbLoop").innerHTML = "LOOP<br>" + fmt(data.eventLoop.meanMs, 0) + "ms";

        ["orbCpu","orbRam","orbNode","orbLoop"].forEach(function (id) {
          var el = $(id);
          var v = id === "orbCpu" ? data.cpu.usage : id === "orbRam" ? data.memory.usage : id === "orbNode" ? data.cpu.processUsage : Math.min(100, data.eventLoop.meanMs);
          el.style.borderColor = statusColor(v);
          el.style.boxShadow = "0 0 18px " + statusColor(v) + "22";
        });
      }

      function renderPulse() {
        var vals = state.history.cpu;
        if (!vals.length) return;
        var width = 600;
        var points = vals.map(function (v, i) {
          var x = vals.length === 1 ? 0 : (i / (vals.length - 1)) * width;
          var y = 92 - clamp(v) * .65;
          return [x, y];
        });
        var d = "M" + points.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" L");
        $("pulsePath").setAttribute("d", d);
      }

      function addTerminal(message, tone) {
        var terminal = $("terminalLog");
        var line = document.createElement("div");
        line.className = tone || "";
        line.textContent = "[" + nowTime() + "] " + message;
        terminal.appendChild(line);
        while (terminal.children.length > 22) terminal.removeChild(terminal.firstChild);
        terminal.scrollTop = terminal.scrollHeight;
      }

      function addActivity(message) {
        var stream = $("activityStream");
        var line = document.createElement("div");
        line.textContent = nowTime() + "  " + message;
        stream.prepend(line);
        while (stream.children.length > 16) stream.removeChild(stream.lastChild);
      }

      function updateCharts(data) {
        var labels = state.history.cpu.map(function (_, i) { return i + 1; });
        chartUpdate(state.charts.cpu, labels, state.history.cpu);
        chartUpdate(state.charts.memory, labels, state.history.memory);
        chartUpdate(state.charts.loop, labels, state.history.loop);
        chartUpdate(state.charts.http, labels, state.history.http);

        if (state.charts.load) {
          state.charts.load.data.datasets[0].data = data.cpu.loadAverage;
          state.charts.load.update("none");
        }
      }

      function render(data) {
        state.latest = data;

        addHistory(state.history.cpu, data.cpu.usage);
        addHistory(state.history.memory, data.memory.usage);
        addHistory(state.history.loop, data.eventLoop.meanMs);
        addHistory(state.history.http, data.http.requestsPerMinute);
        addHistory(state.history.health, data.health.score);

        setText("headerHost", data.system.hostname);
        setText("headerProvider", data.environment.provider);
        setText("kpiCpu", fmt(data.cpu.usage, 1) + "%");
        setText("kpiCpuSub", "MÉDIA " + fmt(data.cpu.averageRecent, 1) + "% · PICO " + fmt(data.cpu.peakRecent, 1) + "%");
        setText("kpiMemory", fmt(data.memory.usage, 1) + "%");
        setText("kpiMemorySub", data.memory.usedFormatted + " / " + data.memory.totalFormatted);
        setText("kpiUptime", data.system.uptimeFormatted.split(" ")[0]);
        setText("kpiUptimeSub", data.system.uptimeFormatted);
        setText("kpiLoop", fmt(data.eventLoop.meanMs, 1) + "ms");
        setText("kpiLoopSub", data.eventLoop.label);

        $("loopStatusTag").textContent = data.eventLoop.label;
        $("loopStatusTag").style.color = data.eventLoop.label === "CRÍTICO" ? "#ff375f" : data.eventLoop.label === "DEGRADADO" ? "#ffd43b" : "#00ff9d";

        $("cpuSpark").setAttribute("points", sparkPoints(state.history.cpu));
        $("memorySpark").setAttribute("points", sparkPoints(state.history.memory));
        $("loopSpark").setAttribute("points", sparkPoints(state.history.loop));
        $("httpSpark").setAttribute("points", sparkPoints(state.history.http));
        $("healthSpark").setAttribute("points", sparkPoints(state.history.health));

        renderCores(data.cpu);
        renderIdentity(data);
        renderCloud(data);
        renderMemory(data);
        renderNetwork(data);
        renderProject(data.project);
        renderAlerts(data.alerts);
        renderHealth(data);
        renderHttp(data);
        renderResourceMatrix(data);
        renderPulse();
        updateCharts(data);
        renderOmega(data);
        renderTaskManager(data);

        $("statusApi").textContent = "API CONECTADA · " + state.transport;
        $("statusNode").textContent = "NODE " + data.runtime.node;
        var footerMode = String(data.environment.deploymentMode || "")
          .replace("LOCAL MACHINE", "MÁQUINA LOCAL")
          .replace("RENDER CLOUD", "NUVEM RENDER")
          .replace("RAILWAY CLOUD", "NUVEM RAILWAY")
          .replace("FLY.IO CLOUD", "NUVEM FLY.IO")
          .replace("HEROKU CLOUD", "NUVEM HEROKU");
        $("statusProvider").textContent = data.environment.provider + (footerMode ? " · " + footerMode : "");
        $("statusLatency").textContent = "LATÊNCIA " + fmt(state.latency, 0) + "ms";
        $("statusUptime").textContent = "TEMPO LIGADO " + data.system.uptimeFormatted;

        addActivity("TELEMETRIA_ATUALIZADA");
      }

      async function fetchTelemetry(manual) {
        setConnection(manual ? "SYNCING" : (state.latest ? "LIVE" : "SYNCING"));
        var started = performance.now();
        try {
          var response = await fetch("/api/dashboard", { cache: "no-store" });
          state.latency = performance.now() - started;
          if (!response.ok) throw new Error("HTTP " + response.status);
          var payload = await response.json();
          if (!payload.success || !payload.data) throw new Error(payload.error || "Resposta inválida");
          render(payload.data);
          setConnection("LIVE");
          addTerminal("fluxo de telemetria sincronizado · api " + fmt(state.latency, 1) + " ms", "cyan");
        } catch (error) {
          setConnection(state.latest ? "DEGRADED" : "CONNECTION LOST");
          $("statusApi").textContent = "API DESCONECTADA";
          addTerminal("erro de telemetria · " + error.message, "yellow");
        }
      }

      function safeReport() {
        var d = state.latest;
        if (!d) return null;
        return {
          schema: "nexus-os-report-v1",
          timestamp: new Date().toISOString(),
          provider: d.environment.provider,
          deploymentMode: d.environment.deploymentMode,
          region: d.environment.region,
          hostname: d.system.hostname,
          platform: d.system.platform,
          osType: d.system.type,
          kernel: d.system.release,
          architecture: d.system.architecture,
          nodeVersion: d.runtime.node,
          primaryIp: d.network.primaryIp,
          cpu: {
            cores: d.cpu.cores,
            usage: d.cpu.usage,
            model: d.cpu.model,
            speedMHz: d.cpu.speedMHz
          },
          memory: {
            total: d.memory.total,
            used: d.memory.used,
            free: d.memory.free,
            usage: d.memory.usage
          },
          uptime: d.system.uptime,
          eventLoop: {
            meanMs: d.eventLoop.meanMs,
            label: d.eventLoop.label
          },
          health: d.health,
          http: {
            requestsPerMinute: d.http.requestsPerMinute,
            avgResponseTimeMs: d.http.avgResponseTimeMs,
            errorRate: d.http.errorRate
          }
        };
      }

      function downloadReport() {
        var report = safeReport();
        if (!report) return;
        var blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "nexus-report-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        addTerminal("relatório seguro do sistema exportado", "cyan");
      }

      async function copyReport() {
        var report = safeReport();
        if (!report) return;
        var text = JSON.stringify(report, null, 2);
        try {
          await navigator.clipboard.writeText(text);
          addTerminal("relatório seguro copiado para a área de transferência", "cyan");
        } catch {
          var area = document.createElement("textarea");
          area.value = text;
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
          addTerminal("relatório seguro copiado pelo modo alternativo", "cyan");
        }
      }

      function parseReport(file, slot) {
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var report = JSON.parse(String(reader.result));
            if (!report || report.schema !== "nexus-os-report-v1") {
              throw new Error("Formato de relatório não suportado");
            }
            state.reports[slot] = report;
            $(slot === "a" ? "envAStatus" : "envBStatus").textContent =
              report.provider + " · " + report.hostname + " · " + report.platform;
            addTerminal("relatório do ambiente " + slot.toUpperCase() + " importado", "cyan");
            renderComparison();
          } catch (error) {
            $(slot === "a" ? "envAStatus" : "envBStatus").textContent = "Relatório inválido: " + error.message;
          }
        };
        reader.readAsText(file);
      }

      function comparableScore(report) {
        var loopScore = Math.max(0, 100 - Math.min(100, Number(report.eventLoop && report.eventLoop.meanMs || 0)));
        var apiScore = Math.max(0, 100 - Math.min(100, Number(report.http && report.http.avgResponseTimeMs || 0) / 4));
        return [
          100 - clamp(report.cpu && report.cpu.usage || 0),
          100 - clamp(report.memory && report.memory.usage || 0),
          clamp(report.health && report.health.score || 0),
          loopScore,
          apiScore
        ];
      }

      function renderComparison() {
        var a = state.reports.a;
        var b = state.reports.b;
        if (!a || !b) return;

        var rows = [
          ["Provedor", a.provider, b.provider],
          ["SO", a.platform + " / " + a.kernel, b.platform + " / " + b.kernel],
          ["Uso da CPU", fmt(a.cpu.usage, 1) + "%", fmt(b.cpu.usage, 1) + "%"],
          ["Núcleos da CPU", a.cpu.cores, b.cpu.cores],
          ["Uso da RAM", fmt(a.memory.usage, 1) + "%", fmt(b.memory.usage, 1) + "%"],
          ["Arquitetura", a.architecture, b.architecture],
          ["Node.js", a.nodeVersion, b.nodeVersion],
          ["IP principal", a.primaryIp, b.primaryIp],
          ["Região", a.region, b.region],
          ["Tempo ligado", Math.floor(a.uptime / 3600) + "h", Math.floor(b.uptime / 3600) + "h"],
          ["Saúde", a.health.score + " / " + a.health.label, b.health.score + " / " + b.health.label],
          ["Event Loop", fmt(a.eventLoop.meanMs, 2) + "ms", fmt(b.eventLoop.meanMs, 2) + "ms"]
        ];

        var html = '<table><thead><tr><th>MÉTRICA</th><th>AMBIENTE A</th><th>AMBIENTE B</th></tr></thead><tbody>';
        rows.forEach(function (r) {
          html += '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>';
        });
        html += "</tbody></table>";
        $("comparisonTable").innerHTML = html;

        if (state.charts.comparison) {
          state.charts.comparison.data.datasets[0].data = comparableScore(a);
          state.charts.comparison.data.datasets[0].label = a.provider || "AMBIENTE A";
          state.charts.comparison.data.datasets[1].data = comparableScore(b);
          state.charts.comparison.data.datasets[1].label = b.provider || "AMBIENTE B";
          state.charts.comparison.update("none");
        }
      }

      function formatClientBytes(bytes) {
        var n = Number(bytes) || 0;
        if (n <= 0) return "0 B";
        var units = ["B","KB","MB","GB","TB"];
        var i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
        return fmt(n / Math.pow(1024, i), i >= 3 ? 2 : 1) + " " + units[i];
      }

      function miniStat(label, value, deltaClass) {
        return '<div class="mini-stat"><span>' + esc(label) + '</span><b class="' + (deltaClass || "") + '">' + esc(value) + '</b></div>';
      }

      function liveScore(node, latency) {
        if (!node) return [0,0,0,0,0];
        var cpuUsage = Number(node.cpu && node.cpu.usage) || 0;
        var memUsage = Number(node.memory && node.memory.usage) || 0;
        var health = Number(node.health && node.health.score) || 0;
        var loopMs = Number(node.eventLoop && node.eventLoop.meanMs) || 0;
        var apiMs = Number(latency) || Number(node.http && node.http.avgResponseTimeMs) || 0;
        return [
          clamp(100 - cpuUsage),
          clamp(100 - memUsage),
          clamp(health),
          clamp(100 - Math.min(100, loopMs)),
          clamp(100 - Math.min(100, apiMs / 4))
        ];
      }

      function renderOmega(data) {
        var intel = data.runtime.intelligence || {};
        var elu = intel.eventLoopUtilization || {};
        var gc = intel.gc || {};
        var session = data.session || {};
        var anomaly = session.anomaly || { level:"APRENDENDO", score:0, message:"Construindo linha de base" };

        setText("transportChip", String(state.transport).replace("PAUSED","PAUSADO").replace("BOOT","INICIALIZAÇÃO"));
        setText("sampleChip", String(session.samples || 0));
        setText("cpuHeadroomChip", fmt(data.cpu.headroom, 1) + "%");
        setText("ramHeadroomChip", fmt(data.memory.headroom, 1) + "%");
        setText("eluChip", fmt(elu.utilization, 1) + "%");
        setText("gcChip", String(gc.total || 0));
        setText("cpuP95", fmt(session.cpu && session.cpu.p95, 1) + "%");
        setText("ramP95", fmt(session.memory && session.memory.p95, 1) + "%");
        setText("loopP95", fmt(session.eventLoop && session.eventLoop.p95, 1) + "ms");
        setText("healthAvg", fmt(session.health && session.health.average, 0));

        var anomalyLabels = { HIGH:"ALTA", ELEVATED:"ELEVADA", NORMAL:"NORMAL", APRENDENDO:"APRENDENDO", LEARNING:"APRENDENDO" };
        var anomalyLabel = anomalyLabels[anomaly.level] || anomaly.level;
        $("anomalyTag").textContent = anomalyLabel;
        $("anomalyTitle").textContent = "ANOMALIA // " + anomalyLabel + " · Z " + fmt(anomaly.score, 2);
        $("anomalyText").textContent = anomaly.message;
        var active = anomaly.level === "HIGH" ? 3 : anomaly.level === "ELEVATED" ? 2 : anomaly.level === "NORMAL" ? 1 : 0;
        Array.from($("anomalyMeter").children).forEach(function (el, i) { el.classList.toggle("on", i < active); });

        var heap = intel.heap || {};
        var ru = intel.resourceUsage || {};
        $("runtimeIntel").innerHTML =
          row("USO DO EVENT LOOP", fmt(elu.utilization, 2) + "%", true, "Percentual de tempo em que o event loop esteve ativo no intervalo.") +
          row("LIMITE DO HEAP", heap.heapSizeLimitFormatted || "N/A") +
          row("HEAP DISPONÍVEL", heap.totalAvailableSizeFormatted || "N/A") +
          row("EVENTOS DE GC", gc.total || 0) +
          row("MÉDIA DO GC", fmt(gc.averageDurationMs, 3) + " ms") +
          row("RSS MÁXIMO", ru.maxRssFormatted || "N/A") +
          row("TROCAS DE CONTEXTO VOL.", ru.voluntaryContextSwitches === undefined ? "N/A" : ru.voluntaryContextSwitches) +
          row("TROCAS DE CONTEXTO INVOL.", ru.involuntaryContextSwitches === undefined ? "N/A" : ru.involuntaryContextSwitches) +
          row("DISCO", data.storage ? data.storage.usedFormatted + " / " + data.storage.totalFormatted : "N/A");

        $("localTwinProvider").textContent = data.environment.provider;
        $("localTwin").innerHTML =
          miniStat("CPU", fmt(data.cpu.usage,1)+"%") +
          miniStat("RAM", fmt(data.memory.usage,1)+"%") +
          miniStat("SAÚDE", data.health.score) +
          miniStat("LOOP", fmt(data.eventLoop.meanMs,1)+"ms") +
          miniStat("NÚCLEOS", data.cpu.cores) +
          miniStat("RAM TOTAL", data.memory.totalFormatted);

        if (state.remote) {
          var r = state.remote;
          $("remoteTwinProvider").textContent = r.provider || "REMOTO";
          $("remoteTwin").innerHTML =
            miniStat("CPU", fmt(r.cpu && r.cpu.usage,1)+"%", (r.cpu && r.cpu.usage) > data.cpu.usage ? "delta-up" : "delta-down") +
            miniStat("RAM", fmt(r.memory && r.memory.usage,1)+"%", (r.memory && r.memory.usage) > data.memory.usage ? "delta-up" : "delta-down") +
            miniStat("SAÚDE", r.health ? r.health.score : "N/A") +
            miniStat("LOOP", fmt(r.eventLoop && r.eventLoop.meanMs,1)+"ms") +
            miniStat("NÚCLEOS", r.cpu ? r.cpu.cores : "N/A") +
            miniStat("RAM TOTAL", formatClientBytes(r.memory && r.memory.total));
        }

        if (state.charts.liveComparison) {
          state.charts.liveComparison.data.datasets[0].data = liveScore({cpu:data.cpu,memory:data.memory,health:data.health,eventLoop:data.eventLoop,http:data.http}, state.latency);
          state.charts.liveComparison.data.datasets[0].label = data.environment.provider + " / ATUAL";
          state.charts.liveComparison.data.datasets[1].data = liveScore(state.remote, state.remoteLatency);
          state.charts.liveComparison.data.datasets[1].label = state.remote ? ((state.remote.provider || "REMOTO") + " / AO VIVO") : "REMOTO / AGUARDANDO";
          state.charts.liveComparison.update("none");
        }

        if (state.recording) {
          state.records.push({
            timestamp:new Date().toISOString(), cpu:data.cpu.usage, memory:data.memory.usage,
            health:data.health.score, eventLoop:data.eventLoop.meanMs, apiLatency:state.latency,
            provider:data.environment.provider,
            remoteProvider:state.remote ? state.remote.provider : "",
            remoteCpu:state.remote && state.remote.cpu ? state.remote.cpu.usage : "",
            remoteMemory:state.remote && state.remote.memory ? state.remote.memory.usage : "",
            remoteHealth:state.remote && state.remote.health ? state.remote.health.score : ""
          });
          if (state.records.length > MAX_RECORDS) state.records.shift();
        }
      }

      function normalizeRemoteUrl(value) {
        var url = new URL(String(value || "").trim());
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Use uma URL http/https");
        return url.origin;
      }

      async function fetchRemote() {
        if (!state.remoteUrl || state.paused) return;
        var started = performance.now();
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 20000);
        try {
          var response = await fetch(state.remoteUrl + "/api/public-snapshot", { cache:"no-store", mode:"cors", signal:controller.signal });
          if (!response.ok) throw new Error("HTTP " + response.status);
          var payload = await response.json();
          if (!payload.success || payload.schema !== "nexus-os-live-v2") throw new Error("Endpoint remoto compatível do NEXUS não encontrado");
          state.remoteLatency = performance.now() - started;
          state.remote = payload;
          $("remoteTag").textContent = "AO VIVO · " + fmt(state.remoteLatency,0) + "ms";
          $("remoteTag").style.color = "#00ff9d";
          $("remoteState").innerHTML = '<span class="ok">● LINK ESTABELECIDO</span><span>' + esc(payload.hostname) + ' · ' + esc(payload.provider) + ' · ' + esc(payload.region || "N/A") + '</span>';
          if (state.latest) renderOmega(state.latest);
        } catch (error) {
          state.remote = null;
          $("remoteTag").textContent = "LINK PERDIDO";
          $("remoteTag").style.color = "#ff375f";
          $("remoteState").innerHTML = '<span class="bad">● FALHA NA CONEXÃO</span><span>' + esc(error.name === "AbortError" ? "Tempo limite do servidor remoto" : error.message) + '</span>';
          $("remoteTwinProvider").textContent = "DESCONECTADO";
          $("remoteTwin").innerHTML = '<div class="metric-name">NÓ REMOTO INDISPONÍVEL</div>';
        } finally { clearTimeout(timeout); }
      }

      function connectRemote() {
        try {
          state.remoteUrl = normalizeRemoteUrl($("remoteUrl").value);
          $("remoteUrl").value = state.remoteUrl;
          localStorage.setItem("nexusRemoteUrl", state.remoteUrl);
          clearInterval(state.remoteTimer);
          fetchRemote();
          state.remoteTimer = setInterval(fetchRemote, Math.max(2200, state.sampleMs * 2));
          addTerminal("link NEXUS ativado · " + state.remoteUrl, "cyan");
        } catch (error) {
          $("remoteState").textContent = error.message;
        }
      }

      function disconnectRemote() {
        clearInterval(state.remoteTimer); state.remoteTimer = null; state.remote = null; state.remoteUrl = "";
        localStorage.removeItem("nexusRemoteUrl");
        $("remoteUrl").value = ""; $("remoteTag").textContent = "DESCONECTADO"; $("remoteTag").style.color = "";
        $("remoteState").textContent = "Link remoto desconectado.";
        $("remoteTwinProvider").textContent = "AGUARDANDO";
        $("remoteTwin").innerHTML = '<div class="metric-name">NENHUM NÓ REMOTO CONECTADO</div>';
        if (state.latest) renderOmega(state.latest);
      }

      function exportSession() {
        if (!state.records.length) { addTerminal("a gravação da sessão não possui amostras", "yellow"); return; }
        var keys = Object.keys(state.records[0]);
        var csv = keys.join(",") + "\n" + state.records.map(function (r) { return keys.map(function (k) { return JSON.stringify(r[k] === undefined ? "" : r[k]); }).join(","); }).join("\n");
        var blob = new Blob([csv], {type:"text/csv"}); var url = URL.createObjectURL(blob); var a=document.createElement("a");
        a.href=url; a.download="nexus-session-"+new Date().toISOString().replace(/[:.]/g,"-")+".csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        addTerminal("sessão de telemetria exportada · " + state.records.length + " amostras", "cyan");
      }

      function stopTransport() {
        if (state.eventSource) { state.eventSource.close(); state.eventSource = null; }
        if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
      }

      function startPolling() {
        stopTransport(); state.transport = "CONSULTA " + (state.sampleMs/1000) + "s";
        fetchTelemetry(true);
        state.pollTimer = setInterval(function () { fetchTelemetry(false); }, state.sampleMs);
      }

      function startTransport() {
        stopTransport();
        if (state.paused) { state.transport="PAUSADO"; if(state.latest) renderOmega(state.latest); return; }
        if (window.EventSource && state.sampleMs === 1500) {
          state.transport = "SSE";
          var es = new EventSource("/api/stream"); state.eventSource = es;
          es.addEventListener("telemetry", function (event) {
            try { var payload=JSON.parse(event.data); if(payload.success && payload.data && !state.paused){ state.latency=0; render(payload.data); setConnection("LIVE"); } } catch (_) {}
          });
          es.addEventListener("fault", function () { setConnection("DEGRADED"); });
          es.onerror = function () { if(state.eventSource===es){ es.close(); state.eventSource=null; startPolling(); } };
        } else startPolling();
      }

      function refreshThemeDots(theme) {
        document.querySelectorAll(".theme-dot").forEach(function(btn){ btn.classList.toggle("active", btn.getAttribute("data-t") === theme); });
      }

      function setTheme(theme) {
        var allowed = ["cyan","violet","emerald","crimson","solar"];
        if (allowed.indexOf(theme) < 0) theme = "cyan";
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("nexusTheme", theme);
        refreshThemeDots(theme);
        if ($("themeSelect")) $("themeSelect").value = theme;
      }

      function setNeon(level) {
        if (["off","soft","hyper"].indexOf(level) < 0) level = "soft";
        state.neon = level;
        document.documentElement.setAttribute("data-neon", level);
        localStorage.setItem("nexusNeon", level);
        $("neonSelect").value = level;
      }

      function setObservation(enabled) {
        state.observation = Boolean(enabled);
        document.body.classList.toggle("observation-mode", state.observation);
        localStorage.setItem("nexusObservation", state.observation ? "1" : "0");
        var btn = $("observationBtn");
        if (btn) {
          btn.classList.toggle("active", state.observation);
          var span = btn.querySelector("span");
          if (span) span.textContent = state.observation ? "OBSERVAÇÃO ATIVA" : "MODO OBSERVAÇÃO";
        }
      }

      function renderTaskManager(data) {
        var tm = data && data.taskManager ? data.taskManager : null;
        if (!tm) return;
        $("taskModeTag").textContent = ({WINDOWS:"WINDOWS",POSIX:"LINUX / POSIX","RENDER / LINUX":"RENDER / LINUX",LIMITED:"LIMITADO",INITIALIZING:"INICIALIZANDO"})[tm.mode] || tm.mode || "LIMITADO";
        $("taskCount").textContent = String(tm.totalVisible || 0);
        $("taskNexusPid").textContent = String(tm.currentPid || "--");
        $("taskRefresh").textContent = ((Number(tm.refreshMs) || 5000) / 1000).toFixed(1) + "s";
        $("taskSource").textContent = String(tm.source || "N/A")
          .replace("NODE PROCESS ONLY", "SOMENTE PROCESSO NODE")
          .replace("PROCESS OBSERVER", "OBSERVADOR DE PROCESSOS")
          .replace("READ-ONLY", "SOMENTE LEITURA");
        $("taskStatus").textContent = tm.supported ? "Instantâneo de processos em modo somente leitura · " + (tm.updatedAt ? new Date(tm.updatedAt).toLocaleTimeString("pt-BR") : "sincronizando") : "Modo limitado · somente o processo Node do NEXUS está disponível.";

        var q = (state.taskFilter || "").trim().toLowerCase();
        var items = Array.isArray(tm.items) ? tm.items.slice() : [];
        if (q) items = items.filter(function(item){ return String(item.name || "").toLowerCase().indexOf(q) >= 0 || String(item.pid || "").indexOf(q) >= 0; });
        var sortMode = state.taskSort || "cpu";
        items.sort(function(a,b){
          if (sortMode === "memory") return (Number(b.memoryBytes)||0) - (Number(a.memoryBytes)||0);
          if (sortMode === "name") return String(a.name||"").localeCompare(String(b.name||""), "pt-BR");
          if (sortMode === "pid") return (Number(a.pid)||0) - (Number(b.pid)||0);
          var aCpu = a.cpuPercent !== null && a.cpuPercent !== undefined ? Number(a.cpuPercent) : Number(a.cpuTime)||0;
          var bCpu = b.cpuPercent !== null && b.cpuPercent !== undefined ? Number(b.cpuPercent) : Number(b.cpuTime)||0;
          return bCpu - aCpu;
        });
        var body = $("taskTableBody");
        if (!items.length) { body.innerHTML = '<tr><td colspan="6">NENHUM PROCESSO CORRESPONDE AO FILTRO ATUAL.</td></tr>'; return; }
        body.innerHTML = items.map(function(item){
          var cpu = item.cpuPercent !== null && item.cpuPercent !== undefined ? fmt(item.cpuPercent,1) + "%" : (item.cpuTime !== null && item.cpuTime !== undefined ? fmt(item.cpuTime,1) + "s DE CPU" : "N/A");
          var memPct = item.memoryPercent !== null && item.memoryPercent !== undefined ? fmt(item.memoryPercent,2) + "%" : "N/A";
          return '<tr class="' + (item.nexus ? 'nexus-task' : '') + '">' +
            '<td class="task-name">' + esc(item.name) + (item.nexus ? '<span class="nexus-badge">NEXUS</span>' : '') + '</td>' +
            '<td>' + esc(item.pid) + '</td>' +
            '<td><span class="cpu-pill">' + esc(cpu) + '</span></td>' +
            '<td><span class="mem-pill">' + esc(item.memoryFormatted || "N/A") + '</span></td>' +
            '<td>' + esc(memPct) + '</td>' +
            '<td>' + (item.nexus ? '<span style="color:var(--accent)">NEXUS</span>' : '<span style="color:#788da3">OBSERVADO</span>') + '</td>' +
          '</tr>';
        }).join("");
      }

      function showToast(message, type) {
        var stack = $("toastStack");
        if (!stack) return;
        var el = document.createElement("div");
        el.className = "toast" + (type === "error" ? " error" : "");
        el.textContent = String(message || "");
        stack.appendChild(el);
        while (stack.children.length > 4) stack.removeChild(stack.firstChild);
        setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 3200);
      }

      function initCommandPalette() {
        var palette = $("commandPalette");
        var search = $("commandSearch");
        var list = $("commandList");
        var trigger = $("commandBtn");
        if (!palette || !search || !list || !trigger) return;

        var commands = [
          { label:"Atualizar telemetria agora", run:function(){ return fetchTelemetry(true); } },
          { label:"Conectar ao servidor Render", run:connectRemote },
          { label:"Desconectar servidor remoto", run:disconnectRemote },
          { label:"Alternar modo apresentação", run:function(){ $("presentationBtn").click(); } },
          { label:"Alternar efeitos visuais", run:function(){ $("fxBtn").click(); } },
          { label:"Alternar tela cheia", run:function(){ $("fullscreenBtn").click(); } },
          { label:"Exportar relatório seguro", run:downloadReport },
          { label:"Copiar relatório seguro", run:copyReport },
          { label:"Exportar sessão gravada", run:exportSession },
          { label:"Ativar/desativar modo observação", run:function(){ setObservation(!state.observation); } },
          { label:"Neon intenso", run:function(){ setNeon("hyper"); } },
          { label:"Neon suave", run:function(){ setNeon("soft"); } },
          { label:"Neon desligado", run:function(){ setNeon("off"); } },
          { label:"Tema: Cyber Cyan", run:function(){ setTheme("cyan"); } },
          { label:"Tema: Quantum Violet", run:function(){ setTheme("violet"); } },
          { label:"Tema: Matrix Emerald", run:function(){ setTheme("emerald"); } },
          { label:"Tema: Crimson Reactor", run:function(){ setTheme("crimson"); } },
          { label:"Tema: Solar Gold", run:function(){ setTheme("solar"); } },
          { label:"Ir para gerenciador de tarefas", run:function(){ var el=$("taskManagerSection"); if(el) el.scrollIntoView({behavior:"smooth",block:"start"}); } },
          { label:"Pausar/retomar telemetria", run:function(){ $("pauseBtn").click(); } },
          { label:"Iniciar/parar gravação de sessão", run:function(){ $("recordBtn").click(); } }
        ];

        var filtered = commands.slice();
        var selected = 0;
        var previousFocus = null;

        function close() {
          palette.classList.remove("open");
          palette.setAttribute("aria-hidden", "true");
          document.body.classList.remove("command-open");
          if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
        }

        function safeRun(command) {
          if (!command || typeof command.run !== "function") return;
          try {
            var result = command.run();
            if (result && typeof result.catch === "function") {
              result.catch(function(error){ console.error(error); showToast("O comando falhou: " + (error && error.message ? error.message : "erro desconhecido"), "error"); });
            }
            showToast("Comando executado: " + command.label);
          } catch (error) {
            console.error(error);
            showToast("O comando falhou: " + (error && error.message ? error.message : "erro desconhecido"), "error");
          }
          close();
        }

        function refreshSelection() {
          var nodes = list.querySelectorAll(".command-item");
          nodes.forEach(function(node, index){
            var active = index === selected;
            node.classList.toggle("active", active);
            node.setAttribute("aria-selected", active ? "true" : "false");
            if (active) node.scrollIntoView({block:"nearest"});
          });
        }

        function renderCommands() {
          var q = search.value.trim().toLocaleLowerCase("pt-BR");
          filtered = commands.filter(function(command){ return command.label.toLocaleLowerCase("pt-BR").indexOf(q) >= 0; });
          selected = Math.min(selected, Math.max(0, filtered.length - 1));
          list.innerHTML = "";
          if (!filtered.length) {
            list.innerHTML = '<div class="command-empty">Nenhum comando encontrado.</div>';
            return;
          }
          filtered.forEach(function(command, index){
            var el = document.createElement("button");
            el.type = "button";
            el.className = "command-item";
            el.setAttribute("role", "option");
            el.innerHTML = '<span>' + esc(command.label) + '</span><span>↵</span>';
            el.addEventListener("mouseenter", function(){ selected = index; refreshSelection(); });
            el.addEventListener("click", function(){ safeRun(command); });
            list.appendChild(el);
          });
          refreshSelection();
        }

        function open() {
          if (palette.classList.contains("open")) return;
          previousFocus = document.activeElement;
          palette.classList.add("open");
          palette.setAttribute("aria-hidden", "false");
          document.body.classList.add("command-open");
          search.value = "";
          selected = 0;
          renderCommands();
          setTimeout(function(){ search.focus(); }, 0);
        }

        trigger.addEventListener("click", function(){ palette.classList.contains("open") ? close() : open(); });
        search.addEventListener("input", function(){ selected = 0; renderCommands(); });
        search.addEventListener("keydown", function(e){
          if (e.key === "ArrowDown") { e.preventDefault(); if(filtered.length){ selected = (selected + 1) % filtered.length; refreshSelection(); } }
          else if (e.key === "ArrowUp") { e.preventDefault(); if(filtered.length){ selected = (selected - 1 + filtered.length) % filtered.length; refreshSelection(); } }
          else if (e.key === "Enter") { e.preventDefault(); if(filtered[selected]) safeRun(filtered[selected]); }
          else if (e.key === "Escape") { e.preventDefault(); close(); }
        });
        palette.addEventListener("click", function(e){ if(e.target === palette) close(); });
        document.addEventListener("keydown", function(e){
          if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "k") {
            e.preventDefault();
            e.stopPropagation();
            palette.classList.contains("open") ? close() : open();
          } else if (e.key === "Escape" && palette.classList.contains("open")) {
            e.preventDefault(); close();
          }
        }, true);
        renderCommands();
      }

      function updateClock() {
        var now = new Date();
        $("clock").textContent = now.toLocaleTimeString("pt-BR", { hour12: false });
        $("date").textContent = now.toLocaleDateString("pt-BR");
      }

      function initBoot() {
        var boot = $("bootScreen");
        var seen = localStorage.getItem("nexusBootSeen") === "1";
        var delay = seen ? 350 : 2100;
        setTimeout(function () {
          boot.classList.add("hidden");
          localStorage.setItem("nexusBootSeen", "1");
        }, delay);
      }

      function initControls() {
        $("refreshBtn").addEventListener("click", function () { fetchTelemetry(true); });
        $("exportBtn").addEventListener("click", downloadReport);
        $("copyBtn").addEventListener("click", copyReport);

        $("fullscreenBtn").addEventListener("click", function () {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(function () {});
          } else {
            document.exitFullscreen().catch(function () {});
          }
        });

        $("presentationBtn").addEventListener("click", function () {
          document.body.classList.toggle("presentation");
          addTerminal("modo apresentação " + (document.body.classList.contains("presentation") ? "ativado" : "desativado"));
        });

        var fxOff = localStorage.getItem("nexusFxOff") === "1";
        if (fxOff) document.documentElement.classList.add("fx-off");

        $("fxBtn").addEventListener("click", function () {
          document.documentElement.classList.toggle("fx-off");
          localStorage.setItem("nexusFxOff", document.documentElement.classList.contains("fx-off") ? "1" : "0");
        });

        $("importABtn").addEventListener("click", function () { $("fileA").click(); });
        $("importBBtn").addEventListener("click", function () { $("fileB").click(); });
        $("fileA").addEventListener("change", function (e) { parseReport(e.target.files[0], "a"); });
        $("fileB").addEventListener("change", function (e) { parseReport(e.target.files[0], "b"); });

        $("remoteUrl").value = state.remoteUrl;
        $("connectRemoteBtn").addEventListener("click", connectRemote);
        $("disconnectRemoteBtn").addEventListener("click", disconnectRemote);
        $("remoteUrl").addEventListener("keydown", function(e){ if(e.key === "Enter") connectRemote(); });

        $("profileSelect").value = String(state.sampleMs);
        $("profileSelect").addEventListener("change", function () {
          state.sampleMs = Number(this.value) || 1500;
          localStorage.setItem("nexusSampleMs", String(state.sampleMs));
          if (!state.paused) startTransport();
          if (state.remoteUrl) { clearInterval(state.remoteTimer); state.remoteTimer=setInterval(fetchRemote, Math.max(2200,state.sampleMs*2)); }
        });

        $("pauseBtn").addEventListener("click", function () {
          state.paused = !state.paused;
          this.querySelector("span").textContent = state.paused ? "RETOMAR" : "PAUSAR";
          if (state.paused) { stopTransport(); state.transport="PAUSADO"; setConnection("DEGRADED"); }
          else startTransport();
          if (state.latest) renderOmega(state.latest);
        });

        $("recordBtn").addEventListener("click", function () {
          state.recording = !state.recording;
          this.classList.toggle("recording", state.recording);
          this.querySelectorAll("span")[1].textContent = state.recording ? "GRAVANDO" : "GRAVAR";
          addTerminal("gravação de sessão " + (state.recording ? "iniciada" : "encerrada"), state.recording ? "cyan" : "");
        });
        $("exportSessionBtn").addEventListener("click", exportSession);
        $("themeSelect").addEventListener("change", function(){ setTheme(this.value); });
        document.querySelectorAll(".theme-dot").forEach(function(btn){ btn.addEventListener("click", function(){ setTheme(btn.getAttribute("data-t")); }); });
        $("neonSelect").addEventListener("change", function(){ setNeon(this.value); });
        $("observationBtn").addEventListener("click", function(){ setObservation(!state.observation); });
        $("taskFilter").addEventListener("input", function(){ state.taskFilter = this.value || ""; if(state.latest) renderTaskManager(state.latest); });
        $("taskSort").value = state.taskSort;
        $("taskSort").addEventListener("change", function(){ state.taskSort = this.value || "cpu"; localStorage.setItem("nexusTaskSort", state.taskSort); if(state.latest) renderTaskManager(state.latest); });
      }

      function initTerminal() {
        [
          "sequência de inicialização iniciada",
          "sonda do sistema operacional pronta",
          "matriz de CPU online",
          "telemetria de memória online",
          "coletor de interfaces de rede pronto",
          "runtime Node operacional",
          "detector de nuvem ativado",
          "motor de telemetria online",
          "núcleo NEXUS online"
        ].forEach(function (line, index) {
          setTimeout(function () { addTerminal(line, index > 6 ? "cyan" : ""); }, 120 * index);
        });
      }

      function init() {
        try { localStorage.removeItem("nexusUiScale"); } catch (_) {}
        setTheme(localStorage.getItem("nexusTheme") || "cyan");
        setNeon(state.neon);
        setObservation(state.observation);
        if (window.lucide) lucide.createIcons();
        createCharts();
        initControls();
        initCommandPalette();
        initBoot();
        initTerminal();
        updateClock();
        setInterval(updateClock, 1000);
        startTransport();
        if (state.remoteUrl) {
          setTimeout(connectRemote, 900);
        }
        document.addEventListener("visibilitychange", function(){
          if (!document.hidden && !state.paused) fetchTelemetry(false);
        });
      }

      document.addEventListener("DOMContentLoaded", init);
    })();
  </script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.type('html').send(dashboardHTML);
});

// ======================================================
// ERROR HANDLERS
// ======================================================

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Endpoint de API não encontrado'
    });
  }

  return res.status(404).type('html').send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head><meta charset="UTF-8"><title>404 // NEXUS OS</title></head>
      <body style="margin:0;background:#05070d;color:#fff;font-family:monospace;display:grid;place-items:center;min-height:100vh">
        <div style="text-align:center"><h1 style="color:#00eaff">404</h1><p>ROTA NEXUS NÃO ENCONTRADA</p><a style="color:#00ff9d" href="/">VOLTAR AO NÚCLEO</a></div>
      </body>
    </html>
  `);
});

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  if (res.headersSent) return next(error);

  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Erro interno do servidor'
    });
  }

  return res.status(500).type('text').send('NEXUS OS // ERRO INTERNO DO SERVIDOR');
});

// ======================================================
// SERVER START
// ======================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NEXUS OS ONLINE // PORT ${PORT}`);
  console.log(`ACESSO LOCAL // http://localhost:${PORT}`);
});
