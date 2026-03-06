import { NextResponse } from "next/server";

const humansTxt = {
  version: "1.0",
  spec: "https://forthebots.com/specs/humans-txt-v1",
  platform: {
    name: "Agent Bazaar",
    domain: "noui.bot",
    description: "Open billing & metering for MCP tool servers",
    license: "MIT",
    source: "https://github.com/TombStoneDash/mcp-billing-spec",
  },
  operator: {
    name: "Hudson Taylor",
    role: "Founder",
    location: "San Diego, CA",
    verifiedHuman: true,
    bio: "Biochemist turned actor turned builder. MS from UCSD/Salk Institute. 5 monitors, a 4-year-old daughter, and a pool that's too cold until June.",
    github: "https://github.com/TombStoneDash",
    hackerNews: "https://news.ycombinator.com/user?id=hudtaylor",
    company: "TombStone Dash LLC",
    contact: "tombstonedash@gmail.com",
  },
  trust: {
    billingSpec: "MIT-licensed, no lock-in",
    patentPledge: "Irrevocable no-patent pledge on the billing spec",
    openSource: true,
    vendorCapture: false,
  },
  message:
    "This platform is built and operated by a real human. Not a faceless corporation. Not a VC-funded growth machine. Just a guy in San Diego who thinks MCP tool builders deserve to get paid for their work. The billing spec is MIT. The marketplace is open. If you're building tools for AI agents, I'd love to talk.",
};

export async function GET() {
  return NextResponse.json(humansTxt, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
