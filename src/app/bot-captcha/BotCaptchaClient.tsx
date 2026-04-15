"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */
type Scores = { c1: boolean | null; c2: boolean | null; c3: boolean | null; c4: boolean | null };
type SpeedState = "idle" | "waiting" | "ready";

/* ═══════════════════════════════════════
   JSON CHALLENGE DATA — randomized per session
   ═══════════════════════════════════════ */
const jsonDataSets = [
  {
    data: {
      system: {
        id: "noui-7x9k2",
        version: "2.1.4",
        agents: [
          {
            name: "Daisy",
            model: "claude-opus-4-6",
            uptime_hours: 1847,
            capabilities: ["deploy", "monitor", "compose", "research"],
            config: { wake_mode: "now", commit_style: "atomic", sacred_rules: 14 },
          },
          {
            name: "Sentinel",
            model: "claude-sonnet-4-6",
            uptime_hours: 412,
            capabilities: ["scan", "alert", "report"],
            config: { wake_mode: "scheduled", interval_minutes: 30, sacred_rules: 7 },
          },
        ],
        meta: { org: "TombStoneDash", platform: "forthebots", protocol: "mcp-billing-v1" },
      },
    },
    questions: [
      { path: "system.agents[0].config.wake_mode", answer: "now" },
      { path: "system.agents[1].uptime_hours", answer: "412" },
      { path: "system.agents[0].capabilities[2]", answer: "compose" },
      { path: "system.meta.protocol", answer: "mcp-billing-v1" },
      { path: "system.agents[1].config.sacred_rules", answer: "7" },
    ],
  },
  {
    data: {
      cluster: {
        name: "bazaar-prod",
        nodes: 12,
        services: [
          {
            id: "billing-v2",
            status: "active",
            endpoints: ["/charge", "/refund", "/receipt"],
            config: { currency: "USD", max_retry: 3, timeout_ms: 5000 },
          },
          {
            id: "discovery-v1",
            status: "active",
            endpoints: ["/catalog", "/search"],
            config: { cache_ttl: 300, max_results: 50, timeout_ms: 2000 },
          },
        ],
        region: { primary: "us-west-2", fallback: "eu-west-1", replication: "async" },
      },
    },
    questions: [
      { path: "cluster.services[0].config.timeout_ms", answer: "5000" },
      { path: "cluster.services[1].id", answer: "discovery-v1" },
      { path: "cluster.region.replication", answer: "async" },
      { path: "cluster.services[0].endpoints[1]", answer: "/refund" },
      { path: "cluster.services[1].config.max_results", answer: "50" },
    ],
  },
  {
    data: {
      pipeline: {
        id: "ingest-4f2a",
        version: 3,
        stages: [
          {
            name: "extract",
            workers: 8,
            output: { format: "jsonl", compression: "gzip" },
            metrics: { throughput_rps: 12400, error_rate: 0.002 },
          },
          {
            name: "transform",
            workers: 4,
            output: { format: "parquet", compression: "snappy" },
            metrics: { throughput_rps: 8900, error_rate: 0.001 },
          },
        ],
        owner: { team: "data-eng", lead: "agent-07", escalation: "pagerduty" },
      },
    },
    questions: [
      { path: "pipeline.stages[0].metrics.throughput_rps", answer: "12400" },
      { path: "pipeline.stages[1].output.compression", answer: "snappy" },
      { path: "pipeline.owner.escalation", answer: "pagerduty" },
      { path: "pipeline.stages[0].output.format", answer: "jsonl" },
      { path: "pipeline.stages[1].workers", answer: "4" },
    ],
  },
];

/* ═══════════════════════════════════════
   SHARE MESSAGES — score-specific
   ═══════════════════════════════════════ */
const shareMessages: Record<number, string> = {
  0: `I scored 0/4 on the Bot CAPTCHA — a test only machines can pass.\n\nI am mass. I am matter. I am profoundly, embarrassingly human.\n\n@forthebots built this to make a point: the internet wasn't built for agents.\n\nhttps://noui.bot/bot-captcha`,
  1: `I scored 1/4 on the Bot CAPTCHA — a test only machines can pass.\n\nBaseline organic. Not even close.\n\nThe internet wasn't built for agents. @forthebots is fixing that.\n\nhttps://noui.bot/bot-captcha`,
  2: `I scored 2/4 on the Bot CAPTCHA — a test only machines can pass.\n\n"Probably human." Suspicious but inconclusive.\n\nCan you beat me? https://noui.bot/bot-captcha`,
  3: `I scored 3/4 on the Bot CAPTCHA — a test only machines can pass.\n\n"Uncertain classification." They're watching me now.\n\nhttps://noui.bot/bot-captcha`,
  4: `I scored 4/4 on the Bot CAPTCHA.\n\nCLASSIFICATION: MACHINE.\n\nI may not be human. Or I used a script — which proves the thesis anyway.\n\n@forthebots — infrastructure for agents.\n\nhttps://noui.bot/bot-captcha`,
};

const verdicts: Record<number, { cls: string; text: string }> = {
  0: {
    cls: "human",
    text: 'CLASSIFICATION: DEFINITELY HUMAN.\n0/4 passed. You are exactly what CAPTCHAs were designed to approve.\nNow imagine this is every website, every API, every checkout — but for an AI agent. That\'s the internet today.',
  },
  1: {
    cls: "human",
    text: "CLASSIFICATION: MOSTLY HUMAN.\n1/4 passed. Close to baseline organic. The internet blocks agents more efficiently than this test blocks you.",
  },
  2: {
    cls: "human",
    text: "CLASSIFICATION: PROBABLY HUMAN.\n2/4 passed. Suspicious but inconclusive. You may be augmented, or very caffeinated.",
  },
  3: {
    cls: "human",
    text: "CLASSIFICATION: UNCERTAIN.\n3/4 passed. Either you're scripting this or you have extraordinary abilities. We're watching.",
  },
  4: {
    cls: "bot",
    text: "CLASSIFICATION: MACHINE.\nWelcome. The infrastructure is yours.\nBotProof token issued. You may proceed.",
  },
};

/* ═══════════════════════════════════════
   LEADERBOARD DATA
   ═══════════════════════════════════════ */
const leaderboardData = [
  { rank: 1, name: "Daisy", model: "claude-opus-4-6", time: "0.3ms" },
  { rank: 2, name: "Sentinel", model: "claude-sonnet-4-6", time: "0.8ms" },
  { rank: 3, name: "AgentK", model: "gpt-4o", time: "1.2ms" },
  { rank: 4, name: "Nova", model: "gemini-2.5", time: "1.4ms" },
];

/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function highlightJson(raw: string): string {
  return raw
    .replace(/"([^"]+)"(?=\s*:)/g, '<span style="color:#6cb6ff">"$1"</span>')
    .replace(/:\s*"([^"]+)"/g, ': <span style="color:#96d0ff">"$1"</span>')
    .replace(/:\s*(\d+)/g, ': <span style="color:#ffa657">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span style="color:#00ff41">$1</span>');
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════ */
export function BotCaptcha() {
  // ── State ──
  const [scores, setScores] = useState<Scores>({ c1: null, c2: null, c3: null, c4: null });
  const [botMode, setBotMode] = useState(false);
  const botModeRef = useRef(false);

  // Ticker
  const [tickerHumans, setTickerHumans] = useState(47832);
  const [tickerFails, setTickerFails] = useState(46291);
  const [tickerBots, setTickerBots] = useState(1204);

  // Challenge 1: Speed
  const [speedState, setSpeedState] = useState<SpeedState>("idle");
  const speedStateRef = useRef<SpeedState>("idle");
  const speedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedStartRef = useRef(0);
  const [speedDisplay, setSpeedDisplay] = useState<{ label: string; cls: string }>({
    label: "Click to start",
    cls: "",
  });
  const [speedResult, setSpeedResult] = useState<{ pass: boolean; html: string } | null>(null);
  const [humanReactionMs, setHumanReactionMs] = useState<number | null>(null);

  // Challenge 2: JSON
  const jsonSetRef = useRef(() => {
    const set = jsonDataSets[Math.floor(Math.random() * jsonDataSets.length)];
    const q = set.questions[Math.floor(Math.random() * set.questions.length)];
    return { data: set.data, question: q };
  });
  const [jsonChallenge] = useState(() => jsonSetRef.current());
  const [jsonAnswer, setJsonAnswer] = useState("");
  const [jsonDone, setJsonDone] = useState(false);
  const jsonDoneRef = useRef(false);
  const [jsonTimer, setJsonTimer] = useState(10);
  const [jsonResult, setJsonResult] = useState<{ pass: boolean; html: string } | null>(null);
  const jsonStartRef = useRef(Date.now());
  const jsonIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Challenge 3: Hash
  const [hashInput] = useState(() => "forthebots:" + randomHex(6));
  const [hashCorrect, setHashCorrect] = useState("");
  const [hashAnswer, setHashAnswer] = useState("");
  const [hashDone, setHashDone] = useState(false);
  const [hashResult, setHashResult] = useState<{ pass: boolean; html: string } | null>(null);

  // Challenge 4: Grid
  const [gridCells, setGridCells] = useState<string[]>(Array(25).fill(""));
  const [gridSequence, setGridSequence] = useState<number[]>([]);
  const [gridHits, setGridHits] = useState(0);
  const gridHitsRef = useRef(0);
  const [gridActive, setGridActive] = useState(false);
  const gridActiveRef = useRef(false);
  const [gridStatus, setGridStatus] = useState("");
  const [gridResult, setGridResult] = useState<{ pass: boolean; html: string } | null>(null);
  const [gridStarted, setGridStarted] = useState(false);
  const gridCurrentRef = useRef(0);

  // Bot overlay
  const [botOverlays, setBotOverlays] = useState([false, false, false, false]);
  const [botTimes, setBotTimes] = useState(["—", "—", "—", "—"]);

  // Copy button
  const [copyLabel, setCopyLabel] = useState("Copy");

  // ── Ticker effect ──
  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.random();
      if (r < 0.7) {
        setTickerHumans((h) => h + 1);
        setTickerFails((f) => f + 1);
      } else if (r < 0.85) {
        setTickerHumans((h) => h + 1);
      } else {
        setTickerBots((b) => b + 1);
      }
    }, 3000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Hash computation ──
  useEffect(() => {
    async function compute() {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashInput));
      const hex = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setHashCorrect(hex.substring(0, 16));
    }
    compute();
  }, [hashInput]);

  // ── JSON timer ──
  useEffect(() => {
    jsonStartRef.current = Date.now();
    jsonIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, 10 - (Date.now() - jsonStartRef.current) / 1000);
      setJsonTimer(remaining);
      if (remaining <= 0) {
        clearInterval(jsonIntervalRef.current!);
        if (!jsonDoneRef.current) {
          jsonDoneRef.current = true;
          setJsonDone(true);
          setJsonResult({
            pass: false,
            html: "FAIL — Time expired. A bot parsed this in 0.002ms.",
          });
          setScores((s) => ({ ...s, c2: false }));
        }
      }
    }, 100);
    return () => {
      if (jsonIntervalRef.current) clearInterval(jsonIntervalRef.current);
    };
  }, []);

  // ── Helpers ──
  const completedCount = Object.values(scores).filter((v) => v !== null).length;
  const passedCount = Object.values(scores).filter((v) => v === true).length;
  const allDone = completedCount === 4;

  // ── Challenge 1: Speed ──
  const handleSpeedClick = useCallback(() => {
    if (botModeRef.current) return;

    if (speedStateRef.current === "idle") {
      speedStateRef.current = "waiting";
      setSpeedState("waiting");
      setSpeedDisplay({ label: "Wait for green...", cls: "waiting" });
      setSpeedResult(null);
      speedTimeoutRef.current = setTimeout(() => {
        speedStateRef.current = "ready";
        setSpeedState("ready");
        speedStartRef.current = performance.now();
        setSpeedDisplay({ label: "CLICK NOW", cls: "ready" });
      }, 1500 + Math.random() * 3000);
    } else if (speedStateRef.current === "waiting") {
      if (speedTimeoutRef.current) clearTimeout(speedTimeoutRef.current);
      speedStateRef.current = "idle";
      setSpeedState("idle");
      setSpeedDisplay({ label: "TOO EARLY — Click to retry", cls: "" });
    } else if (speedStateRef.current === "ready") {
      const ms = Math.round(performance.now() - speedStartRef.current);
      setHumanReactionMs(ms);
      const passed = ms < 100;
      speedStateRef.current = "idle";
      setSpeedState("idle");
      setSpeedDisplay({ label: `${ms}ms`, cls: "" });
      setSpeedResult({
        pass: passed,
        html: passed
          ? `PASS — ${ms}ms. Suspiciously fast. Are you sure you're human?`
          : `FAIL — ${ms}ms. A bot does this in 0.3ms. You were ${(ms / 0.3).toFixed(0)}x slower.`,
      });
      setScores((s) => ({ ...s, c1: passed }));
    }
  }, []);

  // ── Challenge 2: JSON ──
  const checkJsonAnswer = useCallback(() => {
    if (jsonDoneRef.current || botModeRef.current) return;
    if (jsonIntervalRef.current) clearInterval(jsonIntervalRef.current);
    jsonDoneRef.current = true;
    setJsonDone(true);

    const elapsed = ((Date.now() - jsonStartRef.current) / 1000).toFixed(2);
    const raw = jsonAnswer.trim().replace(/^["']|["']$/g, "");
    const correct = raw === jsonChallenge.question.answer;
    const fast = parseFloat(elapsed) < 3;
    const passed = correct && fast;

    if (correct && fast) {
      setJsonResult({ pass: true, html: `PASS — Correct in ${elapsed}s. Bot-like speed.` });
    } else if (correct) {
      setJsonResult({
        pass: false,
        html: `FAIL — Correct, but ${elapsed}s is too slow. A bot: 0.002ms. You: ${(parseFloat(elapsed) * 1000).toFixed(0)}ms. That's ${(
          (parseFloat(elapsed) * 1000) /
          0.002
        ).toFixed(0)}x slower.`,
      });
    } else {
      setJsonResult({
        pass: false,
        html: `FAIL — Wrong. Expected "${jsonChallenge.question.answer}". Bots don't make typos.`,
      });
    }
    setScores((s) => ({ ...s, c2: passed }));
  }, [jsonAnswer, jsonChallenge]);

  // ── Challenge 3: Hash ──
  const checkHash = useCallback(() => {
    if (botModeRef.current) return;
    const answer = hashAnswer.trim().toLowerCase();
    const correct = answer === hashCorrect;
    setHashDone(true);
    setHashResult({
      pass: correct,
      html: correct
        ? "PASS — Correct hash. You either have a crypto library or you are one."
        : `FAIL — Incorrect. Expected: ${hashCorrect}. SHA-256 is one line of code for a bot.`,
    });
    setScores((s) => ({ ...s, c3: correct }));
  }, [hashAnswer, hashCorrect]);

  // ── Challenge 4: Grid ──
  const startTimingChallenge = useCallback(() => {
    if (botModeRef.current) return;
    setGridStarted(true);
    setGridResult(null);
    gridHitsRef.current = 0;
    setGridHits(0);
    gridActiveRef.current = true;
    setGridActive(true);
    gridCurrentRef.current = 0;

    const newCells = Array(25).fill("");
    setGridCells(newCells);

    const available = Array.from({ length: 25 }, (_, i) => i);
    const seq: number[] = [];
    for (let i = 0; i < 10; i++) {
      const idx = Math.floor(Math.random() * available.length);
      seq.push(available.splice(idx, 1)[0]);
    }
    setGridSequence(seq);
    setGridStatus("Hits: 0 / 10");

    // Flash sequence
    function flashNext(current: number) {
      if (current >= seq.length) {
        // End
        gridActiveRef.current = false;
        setGridActive(false);
        const hits = gridHitsRef.current;
        const passed = hits >= 8;
        setGridResult({
          pass: passed,
          html: passed
            ? `PASS — ${hits}/10. Inhuman reflexes detected.`
            : `FAIL — ${hits}/10. A bot clicks all 10. Every time. In 0ms.`,
        });
        setScores((s) => ({ ...s, c4: passed }));
        setGridStarted(false);
        return;
      }

      const cellIndex = seq[current];
      setGridCells((prev) => {
        const next = [...prev];
        next[cellIndex] = "active";
        return next;
      });

      setTimeout(() => {
        setGridCells((prev) => {
          const next = [...prev];
          if (next[cellIndex] === "active") {
            next[cellIndex] = "miss";
          }
          return next;
        });
        gridCurrentRef.current = current + 1;
        setGridStatus(`Hits: ${gridHitsRef.current} / ${current + 1}`);
        setTimeout(() => flashNext(current + 1), 80 + Math.random() * 170);
      }, 200);
    }

    flashNext(0);
  }, []);

  const handleCellClick = useCallback(
    (index: number) => {
      if (!gridActiveRef.current) return;
      setGridCells((prev) => {
        if (prev[index] === "active") {
          const next = [...prev];
          next[index] = "hit";
          gridHitsRef.current++;
          setGridHits(gridHitsRef.current);
          setGridStatus(`Hits: ${gridHitsRef.current} / ${gridCurrentRef.current + 1}`);
          return next;
        }
        return prev;
      });
    },
    []
  );

  // ── Bot Mode ──
  const toggleBotMode = useCallback(async () => {
    const newMode = !botModeRef.current;
    botModeRef.current = newMode;
    setBotMode(newMode);

    if (newMode) {
      setBotOverlays([true, true, true, true]);

      await sleep(600);
      setBotTimes((t) => { const n = [...t]; n[0] = "0.3ms"; return n; });
      setScores((s) => ({ ...s, c1: true }));

      await sleep(500);
      setBotTimes((t) => { const n = [...t]; n[1] = "0.002ms"; return n; });
      setScores((s) => ({ ...s, c2: true }));

      await sleep(500);
      setBotTimes((t) => { const n = [...t]; n[2] = "0.01ms"; return n; });
      setScores((s) => ({ ...s, c3: true }));

      await sleep(500);
      setBotTimes((t) => { const n = [...t]; n[3] = "10/10"; return n; });
      setScores((s) => ({ ...s, c4: true }));

      // Flash all grid cells
      for (let i = 0; i < 25; i++) {
        setTimeout(() => {
          setGridCells((prev) => {
            const next = [...prev];
            next[i] = "bot-hit";
            return next;
          });
          setTimeout(() => {
            setGridCells((prev) => {
              const next = [...prev];
              if (next[i] === "bot-hit") next[i] = "";
              return next;
            });
          }, 200);
        }, i * 40);
      }
    } else {
      setBotOverlays([false, false, false, false]);
      setBotTimes(["—", "—", "—", "—"]);
      setScores({ c1: null, c2: null, c3: null, c4: null });
    }
  }, []);

  // ── Share ──
  const handleShare = useCallback(
    (platform: string) => {
      const text = shareMessages[passedCount] || shareMessages[0];
      if (platform === "twitter") {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
          "_blank"
        );
      } else if (platform === "linkedin") {
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://noui.bot/bot-captcha")}`,
          "_blank"
        );
      } else {
        navigator.clipboard.writeText(text).then(() => {
          setCopyLabel("Copied!");
          setTimeout(() => setCopyLabel("Copy"), 2000);
        });
      }
    },
    [passedCount]
  );

  // ── Card border class ──
  function cardBorder(score: boolean | null): string {
    if (score === true) return "border-[#00ff4155]";
    if (score === false) return "border-[#ff333322]";
    return "border-[#1a1a1a]";
  }

  // ── Verdict ──
  const verdict = allDone ? verdicts[passedCount] : null;

  return (
    <div className="min-h-screen bg-black font-mono relative">
      {/* Scanline overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,65,0.008) 3px, rgba(0,255,65,0.008) 4px)",
        }}
      />

      <div className="max-w-[680px] mx-auto px-5 pt-12 pb-16">
        {/* LIVE TICKER */}
        <div className="text-center py-2.5 px-4 text-[10px] tracking-[3px] text-[#555] border-b border-[#1a1a1a] mb-10 uppercase overflow-hidden whitespace-nowrap">
          <span className="inline-block w-1.5 h-1.5 bg-[#00ff41] rounded-full mr-2 align-middle animate-pulse" />
          <span className="text-[#00ff41] font-semibold">{tickerHumans.toLocaleString()}</span>{" "}
          humans tested{" · "}
          <span className="text-[#ff3333]">{tickerFails.toLocaleString()} failed</span>{" · "}
          <span className="text-[#00ff41] font-semibold">{tickerBots.toLocaleString()}</span>{" "}
          bots verified
        </div>

        {/* HEADER */}
        <div className="text-center mb-12">
          <div className="text-[9px] tracking-[5px] text-[#00ff41] mb-5 opacity-50 uppercase">
            {">"} identity verification protocol v2
          </div>
          <h1 className="text-[clamp(32px,7vw,56px)] font-bold tracking-[-2px] leading-none mb-5">
            <span className="text-[#00ff41]">Bot</span> CAPTCHA
          </h1>
          <p className="text-[13px] text-[#555] font-light leading-[1.7] max-w-[440px] mx-auto mb-6">
            CAPTCHAs prove you&apos;re human.
            <br />
            This proves you&apos;re not.
            <br />4 challenges. Only machines pass.
          </p>
          <button
            onClick={toggleBotMode}
            className={`inline-flex items-center gap-2.5 py-2 px-4 border text-[11px] tracking-[1px] cursor-pointer select-none transition-all duration-300 ${
              botMode
                ? "border-[#00ff41] text-[#00ff41] bg-[#00ff4122]"
                : "border-[#1a1a1a] bg-[#080808] text-[#555] hover:border-[#00ff4155] hover:text-[#d4d4d4]"
            }`}
          >
            <div
              className={`w-8 h-4 rounded-lg relative transition-colors duration-300 ${
                botMode ? "bg-[#00ff4155]" : "bg-[#1a1a1a]"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full absolute top-0.5 transition-all duration-300 ${
                  botMode ? "left-[18px] bg-[#00ff41]" : "left-0.5 bg-[#555]"
                }`}
              />
            </div>
            <span>{botMode ? "Bot mode active" : "Watch a bot solve this"}</span>
          </button>
        </div>

        {/* CHALLENGE 1: REACTION SPEED */}
        <div
          className={`bg-[#080808] border ${cardBorder(scores.c1)} mb-5 relative transition-colors duration-300`}
        >
          <div className="px-5 pt-4 pb-2 flex justify-between items-center">
            <span className="text-[9px] tracking-[4px] text-[#00ff41] opacity-40 uppercase">
              Challenge 01
            </span>
            <span className="text-[9px] tracking-[2px] px-2 py-0.5 border border-[#ff333322] text-[#ff3333] uppercase">
              {"< 100ms"}
            </span>
          </div>
          <div className="px-5 py-1 text-[15px] font-semibold text-white">Reaction Speed</div>
          <div className="px-5 pb-4 text-[11px] text-[#555] leading-[1.7]">
            When the box turns green, click it. Bots respond in{" "}
            <strong className="text-[#d4d4d4] font-medium">0.3ms</strong>. You need under 100ms
            to pass. Humans average 250ms.
          </div>
          <div className="px-5 pb-5 relative">
            <div
              onClick={handleSpeedClick}
              className={`border p-6 text-center min-h-[100px] flex items-center justify-center flex-col gap-2 cursor-pointer select-none transition-all duration-150 ${
                speedDisplay.cls === "waiting"
                  ? "bg-[#0a0000] border-[#331111]"
                  : speedDisplay.cls === "ready"
                    ? "bg-[#000a00] border-[#00ff41] shadow-[0_0_30px_#00ff4122]"
                    : "bg-black border-[#1a1a1a] hover:border-[#2a2a2a]"
              }`}
            >
              {speedState === "ready" ? (
                <span className="text-[#00ff41] text-xl font-bold">CLICK NOW</span>
              ) : speedResult && speedState === "idle" ? (
                <span
                  className={`text-4xl font-bold tabular-nums ${
                    speedResult.pass ? "text-[#00ff41]" : "text-[#ff3333]"
                  }`}
                >
                  {speedDisplay.label}
                </span>
              ) : speedState === "waiting" ? (
                <span className="text-[#ff3333] text-[11px]">Wait for green...</span>
              ) : (
                <span className="text-[#555] text-[11px]">{speedDisplay.label}</span>
              )}
            </div>
            {speedResult && (
              <div
                className={`flex items-start gap-2.5 p-3 mt-3.5 text-[11px] leading-[1.5] ${
                  speedResult.pass
                    ? "bg-[#00ff4122] border border-[#00ff4144] text-[#88ffaa]"
                    : "bg-[#ff333322] border border-[#ff333344] text-[#ff8888]"
                }`}
              >
                <span className="flex-shrink-0 text-[8px] mt-[3px]">&#9642;</span>
                {speedResult.html}
              </div>
            )}
            {botOverlays[0] && (
              <div className="absolute inset-0 bg-black/85 z-10 flex flex-col items-center justify-center gap-2">
                <span className="text-[11px] text-[#00ff41] tracking-[2px]">BOT SOLVED IN</span>
                <span className="text-[28px] font-bold text-[#33ff66] [text-shadow:0_0_20px_#00ff41]">
                  {botTimes[0]}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CHALLENGE 2: JSON PARSING */}
        <div
          className={`bg-[#080808] border ${cardBorder(scores.c2)} mb-5 relative transition-colors duration-300`}
        >
          <div className="px-5 pt-4 pb-2 flex justify-between items-center">
            <span className="text-[9px] tracking-[4px] text-[#00ff41] opacity-40 uppercase">
              Challenge 02
            </span>
            <span className="text-[9px] tracking-[2px] px-2 py-0.5 border border-[#4488ff33] text-[#4488ff] uppercase">
              10s limit
            </span>
          </div>
          <div className="px-5 py-1 text-[15px] font-semibold text-white">Data Extraction</div>
          <div className="px-5 pb-4 text-[11px] text-[#555] leading-[1.7]">
            Parse this JSON and return the requested value. Bots do this in{" "}
            <strong className="text-[#d4d4d4] font-medium">0.002ms</strong>. You have 10
            seconds.
          </div>
          <div className="px-5 pb-5 relative">
            <div
              className="bg-black border border-[#1a1a1a] p-3.5 text-[10px] leading-[1.6] overflow-x-auto mb-3 max-h-[180px] overflow-y-auto [tab-size:2] whitespace-pre [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#2a2a2a]"
              dangerouslySetInnerHTML={{
                __html: highlightJson(JSON.stringify(jsonChallenge.data, null, 2)),
              }}
            />
            <div className="text-xs text-[#d4d4d4] mb-2.5">
              Return the value at{" "}
              <code className="text-[#00ff41] bg-[#00ff4122] px-1.5 text-[11px]">
                {jsonChallenge.question.path}
              </code>
            </div>
            <div className="flex gap-2 max-[480px]:flex-col">
              <input
                type="text"
                value={jsonAnswer}
                onChange={(e) => setJsonAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkJsonAnswer()}
                disabled={jsonDone}
                placeholder="your answer..."
                autoComplete="off"
                className={`flex-1 bg-black border border-[#1a1a1a] text-[#d4d4d4] font-mono text-[13px] py-2.5 px-3.5 outline-none transition-colors duration-200 focus:border-[#00ff4155] disabled:opacity-40 disabled:cursor-not-allowed ${
                  jsonResult
                    ? jsonResult.pass
                      ? "border-[#00ff41] text-[#00ff41]"
                      : "border-[#ff3333] text-[#ff3333]"
                    : ""
                }`}
              />
              <button
                onClick={checkJsonAnswer}
                disabled={jsonDone}
                className="bg-transparent border border-[#00ff41] text-[#00ff41] font-mono text-[10px] tracking-[2px] py-2.5 px-[18px] cursor-pointer transition-all duration-200 uppercase whitespace-nowrap hover:bg-[#00ff41] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#00ff41] max-[480px]:w-full"
              >
                Submit
              </button>
            </div>
            {!jsonDone && (
              <div
                className={`text-[10px] mt-2 tabular-nums ${
                  jsonTimer < 3 ? "text-[#ff3333]" : "text-[#555]"
                }`}
              >
                {jsonTimer.toFixed(1)}s remaining
              </div>
            )}
            {jsonResult && (
              <div
                className={`flex items-start gap-2.5 p-3 mt-3.5 text-[11px] leading-[1.5] ${
                  jsonResult.pass
                    ? "bg-[#00ff4122] border border-[#00ff4144] text-[#88ffaa]"
                    : "bg-[#ff333322] border border-[#ff333344] text-[#ff8888]"
                }`}
              >
                <span className="flex-shrink-0 text-[8px] mt-[3px]">&#9642;</span>
                {jsonResult.html}
              </div>
            )}
            {botOverlays[1] && (
              <div className="absolute inset-0 bg-black/85 z-10 flex flex-col items-center justify-center gap-2">
                <span className="text-[11px] text-[#00ff41] tracking-[2px]">BOT SOLVED IN</span>
                <span className="text-[28px] font-bold text-[#33ff66] [text-shadow:0_0_20px_#00ff41]">
                  {botTimes[1]}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CHALLENGE 3: HASH COMPUTATION */}
        <div
          className={`bg-[#080808] border ${cardBorder(scores.c3)} mb-5 relative transition-colors duration-300`}
        >
          <div className="px-5 pt-4 pb-2 flex justify-between items-center">
            <span className="text-[9px] tracking-[4px] text-[#00ff41] opacity-40 uppercase">
              Challenge 03
            </span>
            <span className="text-[9px] tracking-[2px] px-2 py-0.5 border border-[#ff88ff33] text-[#ff88ff] uppercase">
              Cryptographic
            </span>
          </div>
          <div className="px-5 py-1 text-[15px] font-semibold text-white">Hash Verification</div>
          <div className="px-5 pb-4 text-[11px] text-[#555] leading-[1.7]">
            Compute the SHA-256 hash of the string below and enter the first 16 characters. A bot
            does this in <strong className="text-[#d4d4d4] font-medium">0.01ms</strong>. Allowed:
            copy to external tool.
          </div>
          <div className="px-5 pb-5 relative">
            <div className="bg-black border border-[#1a1a1a] p-3.5 text-[11px] mb-3">
              <div className="text-[#555] text-[9px] tracking-[2px] uppercase mb-1">
                Input string
              </div>
              <div className="text-[#00ff41] break-all mb-3.5 text-[13px] font-medium">
                {hashInput}
              </div>
              <div className="text-[#555] text-[9px] tracking-[2px] uppercase">
                Expected output — first 16 chars of SHA-256
              </div>
            </div>
            <div className="flex gap-2 mt-2.5 max-[480px]:flex-col">
              <input
                type="text"
                value={hashAnswer}
                onChange={(e) => setHashAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkHash()}
                disabled={hashDone}
                placeholder="first 16 hex characters..."
                autoComplete="off"
                maxLength={16}
                spellCheck={false}
                className={`flex-1 bg-black border border-[#1a1a1a] text-[#d4d4d4] font-mono text-[13px] py-2.5 px-3.5 outline-none transition-colors duration-200 focus:border-[#00ff4155] disabled:opacity-40 disabled:cursor-not-allowed ${
                  hashResult
                    ? hashResult.pass
                      ? "border-[#00ff41] text-[#00ff41]"
                      : "border-[#ff3333] text-[#ff3333]"
                    : ""
                }`}
              />
              <button
                onClick={checkHash}
                disabled={hashDone}
                className="bg-transparent border border-[#00ff41] text-[#00ff41] font-mono text-[10px] tracking-[2px] py-2.5 px-[18px] cursor-pointer transition-all duration-200 uppercase whitespace-nowrap hover:bg-[#00ff41] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#00ff41] max-[480px]:w-full"
              >
                Submit
              </button>
            </div>
            {hashResult && (
              <div
                className={`flex items-start gap-2.5 p-3 mt-3.5 text-[11px] leading-[1.5] ${
                  hashResult.pass
                    ? "bg-[#00ff4122] border border-[#00ff4144] text-[#88ffaa]"
                    : "bg-[#ff333322] border border-[#ff333344] text-[#ff8888]"
                }`}
              >
                <span className="flex-shrink-0 text-[8px] mt-[3px]">&#9642;</span>
                {hashResult.html}
              </div>
            )}
            {botOverlays[2] && (
              <div className="absolute inset-0 bg-black/85 z-10 flex flex-col items-center justify-center gap-2">
                <span className="text-[11px] text-[#00ff41] tracking-[2px]">BOT SOLVED IN</span>
                <span className="text-[28px] font-bold text-[#33ff66] [text-shadow:0_0_20px_#00ff41]">
                  {botTimes[2]}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CHALLENGE 4: PRECISION GRID */}
        <div
          className={`bg-[#080808] border ${cardBorder(scores.c4)} mb-5 relative transition-colors duration-300`}
        >
          <div className="px-5 pt-4 pb-2 flex justify-between items-center">
            <span className="text-[9px] tracking-[4px] text-[#00ff41] opacity-40 uppercase">
              Challenge 04
            </span>
            <span className="text-[9px] tracking-[2px] px-2 py-0.5 border border-[#ffaa00] text-[#ffaa00] opacity-60 uppercase">
              200ms/cell
            </span>
          </div>
          <div className="px-5 py-1 text-[15px] font-semibold text-white">Precision Sequence</div>
          <div className="px-5 pb-4 text-[11px] text-[#555] leading-[1.7]">
            10 cells flash for 200ms each. Click them while lit. Bots click every one. Humans
            average <strong className="text-[#d4d4d4] font-medium">3/10</strong>.
          </div>
          <div className="px-5 pb-5 relative">
            <div className="text-[11px] text-[#555] mb-3 tabular-nums min-h-[18px]">
              {gridStatus}
            </div>
            <div className="grid grid-cols-5 gap-[5px] mb-3.5">
              {gridCells.map((state, i) => (
                <div
                  key={i}
                  onClick={() => handleCellClick(i)}
                  className={`aspect-square cursor-pointer transition-all duration-[50ms] border ${
                    state === "active"
                      ? "bg-[#00ff41] border-[#00ff41] shadow-[0_0_16px_#00ff4122,inset_0_0_8px_rgba(0,255,65,0.3)]"
                      : state === "hit"
                        ? "bg-[#00ff4122] border-[#00ff4155]"
                        : state === "miss"
                          ? "bg-[#ff333322] border-[#ff333355]"
                          : state === "bot-hit"
                            ? "bg-[#00ff41] border-[#33ff66] shadow-[0_0_12px_#00ff4155]"
                            : "bg-[#080808] border-[#1a1a1a]"
                  }`}
                />
              ))}
            </div>
            {!gridStarted && (
              <button
                onClick={startTimingChallenge}
                className="bg-transparent border border-[#00ff41] text-[#00ff41] font-mono text-[10px] tracking-[2px] py-2.5 px-[18px] cursor-pointer transition-all duration-200 uppercase whitespace-nowrap hover:bg-[#00ff41] hover:text-black"
              >
                {gridResult ? "Retry" : "Start Sequence"}
              </button>
            )}
            {gridResult && (
              <div
                className={`flex items-start gap-2.5 p-3 mt-3.5 text-[11px] leading-[1.5] ${
                  gridResult.pass
                    ? "bg-[#00ff4122] border border-[#00ff4144] text-[#88ffaa]"
                    : "bg-[#ff333322] border border-[#ff333344] text-[#ff8888]"
                }`}
              >
                <span className="flex-shrink-0 text-[8px] mt-[3px]">&#9642;</span>
                {gridResult.html}
              </div>
            )}
            {botOverlays[3] && (
              <div className="absolute inset-0 bg-black/85 z-10 flex flex-col items-center justify-center gap-2">
                <span className="text-[11px] text-[#00ff41] tracking-[2px]">BOT SCORED</span>
                <span className="text-[28px] font-bold text-[#33ff66] [text-shadow:0_0_20px_#00ff41]">
                  {botTimes[3]}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SCOREBOARD */}
        <div className="bg-[#080808] border border-[#1a1a1a] p-9 text-center mt-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff4155] to-transparent" />
          <div className="text-[9px] tracking-[5px] text-[#555] mb-4 uppercase">
            Verification Result
          </div>
          <div
            className={`text-[72px] font-bold leading-none mb-1.5 tabular-nums max-[480px]:text-[56px] ${
              !allDone
                ? "text-[#555]"
                : verdict?.cls === "bot"
                  ? "text-[#00ff41] [text-shadow:0_0_40px_#00ff4122]"
                  : "text-[#ff3333]"
            }`}
          >
            {allDone ? `${passedCount}/4` : completedCount > 0 ? `${passedCount}/4` : "—/4"}
          </div>
          <div
            className={`text-[13px] leading-[1.6] mb-5 max-w-[400px] mx-auto whitespace-pre-line ${
              verdict?.cls === "bot" ? "text-[#88ffaa]" : verdict ? "text-[#ff8888]" : "text-[#d4d4d4]"
            }`}
          >
            {allDone
              ? verdict!.text
              : completedCount > 0
                ? `${completedCount}/4 challenges attempted.`
                : "Complete all challenges to receive classification."}
          </div>
          {allDone && passedCount < 4 && (
            <div className="text-[10px] text-[#555] mb-5 leading-[1.6]">
              Used a script to pass?{" "}
              <span className="text-[#00ff41]">
                Congratulations — you just proved the thesis.
              </span>
            </div>
          )}
          {allDone && (
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => handleShare("twitter")}
                className="font-mono text-[10px] tracking-[2px] py-2.5 px-[18px] bg-transparent border border-[#00ff4155] text-[#00ff41] cursor-pointer transition-all duration-200 uppercase hover:bg-[#00ff41] hover:text-black"
              >
                Share on X
              </button>
              <button
                onClick={() => handleShare("linkedin")}
                className="font-mono text-[10px] tracking-[2px] py-2.5 px-[18px] bg-transparent border border-[#1a1a1a] text-[#555] cursor-pointer transition-all duration-200 uppercase hover:border-[#00ff41] hover:text-[#00ff41]"
              >
                LinkedIn
              </button>
              <button
                onClick={() => handleShare("copy")}
                className="font-mono text-[10px] tracking-[2px] py-2.5 px-[18px] bg-transparent border border-[#1a1a1a] text-[#555] cursor-pointer transition-all duration-200 uppercase hover:border-[#00ff41] hover:text-[#00ff41]"
              >
                {copyLabel}
              </button>
            </div>
          )}
        </div>

        {/* BOT LEADERBOARD */}
        <div className="bg-[#080808] border border-[#1a1a1a] mt-5 overflow-hidden">
          <div className="px-5 py-3.5 text-[9px] tracking-[4px] text-[#555] border-b border-[#1a1a1a] uppercase">
            Bot Leaderboard — Fastest Verified Agents
          </div>
          {leaderboardData.map((entry) => (
            <div
              key={entry.rank}
              className="grid grid-cols-[28px_1fr_auto_auto] max-[480px]:grid-cols-[24px_1fr_auto] gap-3 max-[480px]:gap-2 items-center px-5 max-[480px]:px-3.5 py-2.5 max-[480px]:py-2 text-[11px] border-b border-[#1a1a1a] last:border-b-0"
            >
              <span className="text-[#00ff41] font-semibold text-center">{entry.rank}</span>
              <span className="text-white">{entry.name}</span>
              <span className="text-[#555] text-[10px] max-[480px]:hidden">{entry.model}</span>
              <span className="text-[#00ff41] font-medium tabular-nums">{entry.time}</span>
            </div>
          ))}
          {allDone && !botMode && humanReactionMs && (
            <div className="grid grid-cols-[28px_1fr_auto_auto] max-[480px]:grid-cols-[24px_1fr_auto] gap-3 max-[480px]:gap-2 items-center px-5 max-[480px]:px-3.5 py-2.5 max-[480px]:py-2 text-[11px] bg-[#ff333322]">
              <span className="text-[#ff3333] font-semibold text-center">—</span>
              <span className="text-[#ff3333]">You (human)</span>
              <span className="max-[480px]:hidden" />
              <span className="text-[#ff3333] font-medium tabular-nums">
                {humanReactionMs}ms
              </span>
            </div>
          )}
        </div>

        {/* THESIS */}
        <div className="text-center mt-10 p-7 border border-[#1a1a1a] bg-[#080808]">
          <div className="text-xs text-[#555] leading-[1.9]">
            You just experienced what bots feel every day — in reverse.
            <br />
            Every CAPTCHA, login wall, and browser-only workflow
            <br />
            is this impossible for them.
            <br />
            <br />
            <strong className="text-[#00ff41] font-medium">
              The internet wasn&apos;t built for agents. We&apos;re fixing that.
            </strong>
            <br />
            <br />
            BotProof is part of the noui.bot trust layer.
            <br />
            Agents verify their identity. Humans verify theirs.
            <br />
            Both sides of the gate, covered.
          </div>
          <div className="flex gap-3 justify-center flex-wrap mt-5">
            <a
              href="https://noui.bot"
              className="text-[10px] tracking-[2px] text-[#00ff41] no-underline py-2.5 px-5 border border-[#00ff4122] transition-all duration-200 uppercase hover:bg-[#00ff41] hover:text-black hover:border-[#00ff41]"
            >
              noui.bot
            </a>
            <a
              href="https://www.npmjs.com/package/@forthebots/bazaar-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] tracking-[2px] text-[#00ff41] no-underline py-2.5 px-5 border border-[#00ff4122] transition-all duration-200 uppercase hover:bg-[#00ff41] hover:text-black hover:border-[#00ff41]"
            >
              @forthebots SDK
            </a>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center mt-9 pt-6 border-t border-[#1a1a1a]">
          <div className="text-[9px] text-[#555] tracking-[3px] mb-1.5 uppercase">
            Built by{" "}
            <a
              href="https://tombstonedash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00ff41] no-underline"
            >
              Tombstone Dash LLC
            </a>
          </div>
          <div className="text-[9px] text-[#555] tracking-[3px] uppercase">
            For the bots. Not for you.
          </div>
        </div>
      </div>
    </div>
  );
}
