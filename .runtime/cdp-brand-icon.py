import asyncio
import json
import urllib.request

import websockets

targets = json.load(urllib.request.urlopen("http://127.0.0.1:9231/json"))
page = next(t for t in targets if "screen=clips" in t.get("url", ""))


async def main() -> None:
    async with websockets.connect(page["webSocketDebuggerUrl"], max_size=8_000_000) as ws:
        nid = 0

        async def call(method: str, params: dict | None = None):
            nonlocal nid
            nid += 1
            await ws.send(json.dumps({"id": nid, "method": method, "params": params or {}}))
            while True:
                msg = json.loads(await ws.recv())
                if msg.get("id") == nid:
                    return msg.get("result")

        await call("Runtime.enable")
        r = await call(
            "Runtime.evaluate",
            {
                "expression": """(() => {
                  const img = document.querySelector('img.hub-auth-brand-icon');
                  if (!img) return { found: false, imgs: [...document.images].slice(0,8).map(i => ({src:i.src, w:i.naturalWidth, complete:i.complete})) };
                  return {
                    found: true,
                    src: img.currentSrc || img.src,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    complete: img.complete,
                    href: location.href,
                  };
                })()""",
                "returnByValue": True,
            },
        )
        print(json.dumps(r.get("result", {}).get("value"), ensure_ascii=False, indent=2))


asyncio.run(main())
