#!/usr/bin/env node
/* ==========================================================================
   tools/verify.mjs — headless Chrome verification & screenshots.

   Usage:
     node tools/verify.mjs --url "file:///.../index.html?selftest=1" --selftest
     node tools/verify.mjs --url "file:///.../index.html?demo=kpop" --shot docs/main.png

   Prints a JSON report and exits 1 when the self-test fails.
   ========================================================================== */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
function flag(name) {
  return args.includes(`--${name}`);
}

const url = arg("url", "about:blank");
const width = Number(arg("width", 1440));
const height = Number(arg("height", 1000));
const waitMs = Number(arg("wait", 900));
const shot = arg("shot", "");
const selftest = flag("selftest");
const mobile = flag("mobile");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chromePath) {
  console.error(JSON.stringify({ ok: false, error: "Chrome not found. Set CHROME_PATH." }));
  process.exit(1);
}

const port = 9300 + Math.floor(Math.random() * 400);
const profile = `${tmpdir()}\\vbs-profile-${process.pid}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--autoplay-policy=no-user-gesture-required",
    "--force-device-scale-factor=1",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    "about:blank"
  ],
  { stdio: "ignore" }
);

const report = { ok: false, selenium: false, passed: 0, total: 0, results: [], consoleErrors: [] };

async function waitForDevtools() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      /* not ready */
    }
    await sleep(150);
  }
  throw new Error("Chrome DevTools endpoint did not start");
}

async function main() {
  await waitForDevtools();

  const created = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
    method: "PUT"
  });
  const target = await created.json();

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let messageId = 0;
  const pending = new Map();

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    if (msg.method === "Runtime.exceptionThrown") {
      report.consoleErrors.push(msg.params.exceptionDetails.text + " " +
        (msg.params.exceptionDetails.exception?.description || ""));
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      report.consoleErrors.push(
        msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ")
      );
    }
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
      report.consoleErrors.push(msg.params.entry.text);
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++messageId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile
  });

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text);
    }
    return result.result.value;
  };

  let selftestResult = null;
  if (selftest) {
    for (let i = 0; i < 200; i++) {
      selftestResult = await evaluate("window.__SELFTEST__ || null");
      if (selftestResult) break;
      await sleep(150);
    }
    if (selftestResult) {
      report.selenium = true;
      report.passed = selftestResult.passed;
      report.total = selftestResult.total;
      report.results = selftestResult.results;
      report.ok = selftestResult.ok;
    } else {
      report.ok = false;
      report.error = "self-test did not finish";
    }
  } else {
    await sleep(waitMs);
    report.ok = true;
  }

  const clickExpr = arg("click", "");
  if (clickExpr) {
    await evaluate(clickExpr);
    await sleep(waitMs);
  }

  const probeExpr = arg("probe", "");
  if (probeExpr) {
    report.probe = await evaluate(probeExpr);
  }

  if (shot) {
    const png = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const out = resolve(shot);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(png.data, "base64"));
    report.screenshot = out;
    report.ok = report.ok && true;
  }

  ws.close();
}

main()
  .catch((err) => {
    report.ok = false;
    report.error = err.message;
  })
  .finally(async () => {
    try {
      chrome.kill();
    } catch {
      /* ignore */
    }
    await sleep(250);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  });
