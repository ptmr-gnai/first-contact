import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = process.env.BRIDGE_PORT ? parseInt(process.env.BRIDGE_PORT) : 8787;

const INPUT_PATH = '/tmp/signal-input.json';
const OUTPUT_PATH = '/tmp/signal-output.json';
const READY_FLAG = '/tmp/signal-input.ready';
const OUTPUT_READY_FLAG = '/tmp/signal-output.ready';
const POLL_INTERVAL_MS = 200;
const TIMEOUT_MS = 30_000;

function log(msg) {
  console.log(`[bridge] ${msg}`);
}

function cleanupStaleFiles() {
  const staleFiles = [INPUT_PATH, OUTPUT_PATH, READY_FLAG, OUTPUT_READY_FLAG];
  for (const f of staleFiles) {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      log(`cleaned up stale file: ${f}`);
    }
  }
}

function cleanupOutputFiles() {
  if (fs.existsSync(OUTPUT_PATH)) fs.unlinkSync(OUTPUT_PATH);
  if (fs.existsSync(OUTPUT_READY_FLAG)) fs.unlinkSync(OUTPUT_READY_FLAG);
}

function cleanupAllFiles() {
  const files = [INPUT_PATH, OUTPUT_PATH, READY_FLAG, OUTPUT_READY_FLAG];
  for (const f of files) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch (_) {}
  }
}

cleanupStaleFiles();

const wss = new WebSocketServer({ port: PORT });
log(`listening on ws://localhost:${PORT}`);

let activeClient = null;

wss.on('connection', (ws) => {
  if (activeClient && activeClient.readyState === WebSocket.OPEN) {
    log('replacing existing client connection');
    activeClient.close(1000, 'replaced by new connection');
  }
  activeClient = ws;
  log('client connected');

  ws.on('message', (data) => {
    let playerInput;
    try {
      playerInput = JSON.parse(data.toString());
    } catch (err) {
      log(`failed to parse player input: ${err.message}`);
      ws.send(JSON.stringify({ error: 'invalid JSON input' }));
      return;
    }

    log(`received player input (type: ${playerInput.type ?? 'unknown'})`);

    try {
      fs.writeFileSync(INPUT_PATH, JSON.stringify(playerInput, null, 2), 'utf8');
      fs.writeFileSync(READY_FLAG, '', 'utf8');
    } catch (err) {
      log(`failed to write input files: ${err.message}`);
      ws.send(JSON.stringify({ error: 'failed to write input' }));
      return;
    }

    log('wrote input files, waiting for alien response...');

    const start = Date.now();
    const poll = setInterval(() => {
      if (!fs.existsSync(OUTPUT_READY_FLAG)) {
        if (Date.now() - start > TIMEOUT_MS) {
          clearInterval(poll);
          cleanupOutputFiles();
          log('timeout waiting for alien response');
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ error: 'alien response timeout' }));
          }
        }
        return;
      }

      clearInterval(poll);

      let alienResponse;
      try {
        const raw = fs.readFileSync(OUTPUT_PATH, 'utf8');
        alienResponse = JSON.parse(raw);
      } catch (err) {
        log(`failed to read alien response: ${err.message}`);
        cleanupOutputFiles();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ error: 'malformed alien response' }));
        }
        return;
      }

      cleanupOutputFiles();
      log('alien response received, forwarding to client');

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(alienResponse));
      }
    }, POLL_INTERVAL_MS);
  });

  ws.on('close', () => {
    log('client disconnected');
    if (activeClient === ws) activeClient = null;
  });

  ws.on('error', (err) => {
    log(`client error: ${err.message}`);
  });
});

wss.on('error', (err) => {
  log(`server error: ${err.message}`);
});

function shutdown() {
  log('shutting down...');
  cleanupAllFiles();
  wss.close(() => {
    log('server closed');
    process.exit(0);
  });
}

// ── Health check HTTP endpoint ──
const HEALTH_PORT = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT) : 8788;
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    const status = {
      status: 'ok',
      uptime: process.uptime(),
      wsClients: activeClient && activeClient.readyState === WebSocket.OPEN ? 1 : 0,
      timestamp: new Date().toISOString(),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  } else {
    res.writeHead(404);
    res.end();
  }
});
healthServer.listen(HEALTH_PORT, () => {
  log(`health check at http://localhost:${HEALTH_PORT}/health`);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
