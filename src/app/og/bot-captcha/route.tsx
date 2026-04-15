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
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 60,
            width: 50,
            height: 1,
            backgroundColor: "rgba(0,255,65,0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 60,
            width: 1,
            height: 50,
            backgroundColor: "rgba(0,255,65,0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 60,
            width: 50,
            height: 1,
            backgroundColor: "rgba(0,255,65,0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 60,
            width: 1,
            height: 50,
            backgroundColor: "rgba(0,255,65,0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 60,
            width: 50,
            height: 1,
            backgroundColor: "rgba(0,255,65,0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 60,
            width: 1,
            height: 50,
            backgroundColor: "rgba(0,255,65,0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 60,
            width: 50,
            height: 1,
            backgroundColor: "rgba(0,255,65,0.3)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 60,
            width: 1,
            height: 50,
            backgroundColor: "rgba(0,255,65,0.3)",
          }}
        />

        {/* Main title */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: "#00ff41",
            letterSpacing: -2,
            marginBottom: 24,
            display: "flex",
          }}
        >
          BOT CAPTCHA
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 300,
            color: "#888888",
            marginBottom: 32,
            display: "flex",
          }}
        >
          Can you prove you&apos;re a bot?
        </div>

        {/* Divider */}
        <div
          style={{
            width: 320,
            height: 1,
            backgroundColor: "rgba(0,255,65,0.2)",
            marginBottom: 32,
          }}
        />

        {/* Challenge count */}
        <div
          style={{
            fontSize: 18,
            color: "#555555",
            letterSpacing: 3,
            marginBottom: 80,
            display: "flex",
          }}
        >
          4 CHALLENGES. ONLY MACHINES PASS.
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
          noui.bot / BotProof
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
