"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import type { VerifyOutcome } from "@/lib/receipt-verify";
import goodReceipt from "../../../tests/fixtures/receipt.good.json";
import tamperedReceipt from "../../../tests/fixtures/receipt.tampered.json";

export default function VerifyPage() {
  const [receiptText, setReceiptText] = useState(JSON.stringify(goodReceipt, null, 2));
  const [verification, setVerification] = useState<VerifyOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const attempt = useRef(0);

  function clearResult() {
    setVerification(null);
    setError(null);
  }

  async function verify(receipt: unknown) {
    const currentAttempt = ++attempt.current;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    clearResult();
    setPending(true);
    try {
      const deadline = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("Verification timed out after 10 seconds. Please try again."));
          controller.abort();
        }, 10_000);
      });
      const { response, data } = await Promise.race([
        (async () => {
          const response = await fetch("/api/v1/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(receipt),
            signal: controller.signal,
          });
          const data = await response.json();
          return { response, data };
        })(),
        deadline,
      ]);
      if (currentAttempt !== attempt.current) return;
      if (!response.ok) {
        throw new Error(data.message || data.code || "Verification request failed");
      }
      setVerification(data.verification);
    } catch (cause) {
      if (currentAttempt === attempt.current) {
        setError(cause instanceof Error ? cause.message : "Verification request failed");
      }
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
      if (currentAttempt === attempt.current) setPending(false);
    }
  }

  function verifyJson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let receipt: unknown;
    try {
      receipt = JSON.parse(receiptText);
    } catch {
      clearResult();
      setError("Enter valid JSON before verifying the receipt.");
      return;
    }
    void verify(receipt);
  }

  return (
    <main className="min-h-screen bg-black text-white font-mono px-6 md:px-16 lg:px-24 py-16 max-w-4xl">
      <Link href="/spec" className="text-xs text-white/50 hover:text-white transition-colors">
        &larr; MCP Billing Spec
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold mt-8 mb-4">Verify a receipt</h1>
      <p className="text-white/60 text-sm leading-relaxed mb-10">
        Check a receipt&apos;s HMAC-SHA256 signature without an account or API key.
        {" "}Paste the full signed receipt envelope. Verification uses only the JSON you
        supply and does not look up stored receipts. A receipt ID alone is not enough.
        {" "}<Link href="/spec" className="text-white underline hover:text-green-400">Section 3 of the spec</Link>
        {" "}defines the seven signed fields and their canonical order. The prefilled receipt is a
        development example.
      </p>

      <form onSubmit={verifyJson} className="space-y-4">
        <label htmlFor="receipt-json" className="block text-sm">Paste the full signed receipt JSON</label>
        <textarea
          id="receipt-json"
          value={receiptText}
          onChange={(event) => { setReceiptText(event.target.value); clearResult(); }}
          disabled={pending}
          spellCheck={false}
          rows={17}
          className="w-full bg-white/5 border border-white/20 p-4 text-xs leading-relaxed text-white/80 focus:outline-none focus:border-green-400 disabled:opacity-50"
        />
        <div className="flex flex-wrap items-center gap-5">
          <button type="submit" disabled={pending} className="bg-white text-black px-5 py-3 text-sm hover:bg-green-400 disabled:opacity-50">
            Verify JSON
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => { setReceiptText(JSON.stringify(tamperedReceipt, null, 2)); clearResult(); }}
            className="text-xs text-white/60 underline hover:text-white disabled:opacity-50"
          >
            Try a tampered receipt
          </button>
        </div>
      </form>

      <div aria-live="polite" aria-atomic="true" className="mt-10">
        {pending && <p className="text-sm text-white/60">Verifying receipt...</p>}
        {error && <p role="alert" className="border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
        {verification && (
          <section className={`border p-5 ${verification.valid ? "border-green-500/50 bg-green-500/10 text-green-300" : "border-red-500/50 bg-red-500/10 text-red-300"}`}>
            <h2 className="text-xl font-bold">{verification.valid ? "VALID" : "INVALID"}</h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div><dt className="text-white/60">Reason</dt><dd>{verification.reason}</dd></div>
              {verification.missing && <div><dt className="text-white/60">Missing or invalid fields</dt><dd>{verification.missing.join(", ")}</dd></div>}
              <div><dt className="text-white/60">checked.canonical</dt><dd className="whitespace-pre-wrap break-all">{verification.checked.canonical || "Unavailable until all seven fields are present and correctly typed."}</dd></div>
              <div><dt className="text-white/60">Algorithm</dt><dd>{verification.checked.algorithm}</dd></div>
              <div><dt className="text-white/60">verified_at</dt><dd>{verification.verified_at}</dd></div>
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}
