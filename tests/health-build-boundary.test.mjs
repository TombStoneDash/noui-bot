import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const NEXT_BIN = new URL("../node_modules/next/dist/bin/next", import.meta.url);
const DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
];

function withoutDatabaseEnv(extra = {}) {
  const env = { ...process.env, ...extra };

  for (const key of DATABASE_ENV_KEYS) {
    delete env[key];
  }

  return env;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: withoutDatabaseEnv({ NEXT_TELEMETRY_DISABLED: "1" }),
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address !== "string");
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve(port);
        }
      });
    });
  });
}

async function waitForResponse(url, server, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before serving ${url}`);
    }

    try {
      return await fetch(url);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function stopServer(server) {
  if (server.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      server.kill("SIGKILL");
      resolve();
    }, 5_000);

    server.once("close", () => {
      clearTimeout(timeout);
      resolve();
    });
    server.kill("SIGTERM");
  });
}

test(
  "builds without database credentials and health fails closed at runtime",
  { timeout: 120_000 },
  async (t) => {
    const build = await run(process.execPath, [NEXT_BIN.pathname, "build"]);

    assert.equal(
      build.code,
      0,
      `next build failed\nstdout:\n${build.stdout}\nstderr:\n${build.stderr}`
    );
    assert.match(build.stdout, /ƒ \/api\/health\r?\n/);
    assert.match(build.stdout, /ƒ \/api\/v1\/health\r?\n/);

    const port = await getFreePort();
    const server = spawn(
      process.execPath,
      [NEXT_BIN.pathname, "start", "-H", "127.0.0.1", "-p", String(port)],
      {
        cwd: ROOT,
        env: withoutDatabaseEnv({ NEXT_TELEMETRY_DISABLED: "1" }),
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let serverOutput = "";
    server.stdout.on("data", (chunk) => {
      serverOutput += chunk;
    });
    server.stderr.on("data", (chunk) => {
      serverOutput += chunk;
    });
    t.after(() => stopServer(server));

    for (const path of ["/api/health", "/api/v1/health"]) {
      const response = await waitForResponse(
        `http://127.0.0.1:${port}${path}`,
        server
      ).catch((error) => {
        error.message += `\nNext.js output:\n${serverOutput}`;
        throw error;
      });
      const body = await response.json();

      assert.equal(response.status, 503, `${path} must fail closed`);
      assert.equal(body.status, "down");
      assert.equal(body.checks.neon.status, "fail");
      assert.equal(body.checks.neon.message, "DATABASE_URL is required");
    }
  }
);
