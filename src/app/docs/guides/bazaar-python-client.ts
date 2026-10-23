/**
 * The stdlib-only Python client shown in the LangChain, CrewAI and AutoGen guides.
 * It talks to the real HTTP routes: GET /api/bazaar/catalog to discover tools and
 * POST /api/bazaar/proxy to run one. tests/framework-guides-proxy.test.ts runs this
 * code (and each framework snippet) against the real proxy route handler.
 */
export const BAZAAR_PYTHON_CLIENT = `# bazaar_client.py — no dependencies beyond the standard library
import json
import os
import re
import urllib.error
import urllib.request

BAZAAR_URL = "https://noui.bot/api/bazaar"
API_KEY = os.environ["NOUI_API_KEY"]


def list_bazaar_tools() -> list[dict]:
    """Every active tool in the public catalog, following pagination."""
    tools: list[dict] = []
    while True:
        url = f"{BAZAAR_URL}/catalog?limit=100&offset={len(tools)}"
        with urllib.request.urlopen(url, timeout=30) as resp:
            page = json.load(resp)
        tools += page["tools"]
        if not page["tools"] or len(tools) >= page["total"]:
            return tools


def tool_function_name(tool: dict) -> str:
    """LLM function names allow only letters, digits, _ and - (max 64)."""
    return re.sub(r"[^A-Za-z0-9_-]", "_", tool["tool_name"])[:64]


def tool_description(tool: dict) -> str:
    summary = tool["description"] or tool["display_name"]
    return (
        f"{summary} (price: {tool['pricing']['price']}). "
        "Pass the tool's parameters as a JSON object in 'arguments'."
    )


def call_bazaar_tool(tool_id: str, arguments: dict | None) -> str:
    """Run one tool through the metered proxy.

    Failures (402 balance, 429 rate limit, provider errors) come back as text
    so the agent can read them instead of crashing the run.
    """
    request = urllib.request.Request(
        f"{BAZAAR_URL}/proxy",
        data=json.dumps({"tool_id": tool_id, "input": arguments or {}}).encode(),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as resp:
            body = json.load(resp)
    except urllib.error.HTTPError as err:
        try:
            error = json.load(err)
        except ValueError:
            error = {}
        return f"Bazaar error {err.code} {error.get('code', '')}: {error.get('message', err.reason)}"
    return json.dumps(body["result"])`;
