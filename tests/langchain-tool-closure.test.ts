import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("displayed LangChain wrappers retain each tool's callback and arguments", () => {
  const page = readFileSync(
    new URL("../src/app/docs/guides/langchain-setup/page.tsx", import.meta.url),
    "utf8",
  );
  const snippet = page.match(/async def get_bazaar_tools\([\s\S]*?(?=\n\nasync def main\(\):)/)?.[0];
  assert.ok(snippet, "get_bazaar_tools must be present in the displayed snippet");

  const python = `import asyncio
import json
from types import SimpleNamespace

class StructuredTool:
    @staticmethod
    def from_function(**kwargs):
        return SimpleNamespace(**kwargs)

class ClientSession:
    def __init__(self):
        self.calls = []

    async def list_tools(self):
        return SimpleNamespace(tools=[
            SimpleNamespace(name="first", description="First tool"),
            SimpleNamespace(name="second", description="Second tool"),
        ])

    async def call_tool(self, name, arguments):
        self.calls.append([name, arguments])
        return SimpleNamespace(content=[SimpleNamespace(text=name)])

${snippet}

loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)
try:
    session = ClientSession()
    first, second = loop.run_until_complete(get_bazaar_tools(session))
    outputs = [
        loop.run_until_complete(first.coroutine(value="a1")),
        loop.run_until_complete(second.coroutine(value="b1")),
        second.func(value="b2", count=2),
        first.func(value="a2", count=1),
        loop.run_until_complete(second.coroutine(value="b3")),
        first.func(value="a3"),
    ]
    print(json.dumps({
        "tools": [[first.name, first.description], [second.name, second.description]],
        "calls": session.calls,
        "outputs": outputs,
    }))
finally:
    asyncio.set_event_loop(None)
    loop.close()
`;

  const result = spawnSync("python3", ["-"], { input: python, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.deepEqual(JSON.parse(result.stdout), {
    tools: [["first", "First tool"], ["second", "Second tool"]],
    calls: [
      ["first", { value: "a1" }],
      ["second", { value: "b1" }],
      ["second", { value: "b2", count: 2 }],
      ["first", { value: "a2", count: 1 }],
      ["second", { value: "b3" }],
      ["first", { value: "a3" }],
    ],
    outputs: ['["first"]', '["second"]', '["second"]', '["first"]', '["second"]', '["first"]'],
  });
});
