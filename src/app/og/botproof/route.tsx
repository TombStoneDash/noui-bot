import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        {/* Corner accents */}
        <div style={{ position: "absolute", top: 60, left: 60, width: 50, height: 1, backgroundColor: "rgba(0,255,65,0.3)" }} />
        <div style={{ position: "absolute", top: 60, left: 60, width: 1, height: 50, backgroundColor: "rgba(0,255,65,0.3)" }} />
        <div style={{ position: "absolute", top: 60, right: 60, width: 50, height: 1, backgroundColor: "rgba(0,255,65,0.3)" }} />
        <div style={{ position: "absolute", top: 60, right: 60, width: 1, height: 50, backgroundColor: "rgba(0,255,65,0.3)" }} />
        <div style={{ position: "absolute", bottom: 60, left: 60, width: 50, height: 1, backgroundColor: "rgba(0,255,65,0.3)" }} />
        <div style={{ position: "absolute", bottom: 60, left: 60, width: 1, height: 50, backgroundColor: "rgba(0,255,65,0.3)" }} />
        <div style={{ position: "absolute", bottom: 60, right: 60, width: 50, height: 1, backgroundColor: "rgba(0,255,65,0.3)" }} />
        <div style={{ position: "absolute", bottom: 60, right: 60, width: 1, height: 50, backgroundColor: "rgba(0,255,65,0.3)" }} />

        {/* Shield / checkmark icon area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "2px solid rgba(0,255,65,0.3)",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontSize: 40,
              color: "#00ff41",
              display: "flex",
            }}
          >
            &#x2713;
          </div>
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#00ff41",
            letterSpacing: -2,
            marginBottom: 16,
            display: "flex",
          }}
        >
          BotProof
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: "#888888",
            marginBottom: 24,
            display: "flex",
          }}
        >
          Proof-of-bot verification protocol
        </div>

        {/* Divider */}
        <div
          style={{
            width: 280,
            height: 1,
            backgroundColor: "rgba(0,255,65,0.2)",
            marginBottom: 24,
          }}
        />

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 16,
            color: "#555555",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "6px 16px",
              border: "1px solid #1a1a1a",
            }}
          >
            3 Levels
          </div>
          <div
            style={{
              display: "flex",
              padding: "6px 16px",
              border: "1px solid #1a1a1a",
            }}
          >
            24h Tokens
          </div>
          <div
            style={{
              display: "flex",
              padding: "6px 16px",
              border: "1px solid #1a1a1a",
            }}
          >
            100ms Challenges
          </div>
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            fontSize: 20,
            color: "rgba(0,255,65,0.5)",
            display: "flex",
          }}
        >
          noui.bot
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
