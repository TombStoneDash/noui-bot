export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="font-mono text-center max-w-md">
        <h1 className="text-6xl font-bold text-white/20 mb-4">404</h1>
        <p className="text-white/60 mb-8">
          This endpoint doesn&apos;t exist.<br />
          But maybe it should.
        </p>
        <div className="space-y-3 text-sm text-white/40">
          <div>
            <span className="text-white/20">→</span>{" "}
            Tell us what you need:{" "}
            <a href="/api/v1/feedback" className="text-cyan-400/60 hover:text-cyan-300">
              POST /api/v1/feedback
            </a>
          </div>
          <div>
            <span className="text-white/20">→</span>{" "}
            See what exists:{" "}
            <a href="/api/v1" className="text-cyan-400/60 hover:text-cyan-300">
              GET /api/v1
            </a>
          </div>
          <div>
            <span className="text-white/20">→</span>{" "}
            Full docs:{" "}
            <a href="/docs" className="text-cyan-400/60 hover:text-cyan-300">
              /docs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
