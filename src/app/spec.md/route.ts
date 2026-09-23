import fs from "fs";
import path from "path";

export const dynamic = "force-static";

export function GET() {
  const specPath = path.join(process.cwd(), "SPEC.md");
  const content = fs.readFileSync(specPath, "utf-8");

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
