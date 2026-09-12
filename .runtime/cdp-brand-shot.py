import asyncio
import base64
import json
import urllib.request

import websockets

targets = json.load(urllib.request.urlopen("http://127.0.0.1:9231/json"))
page = next(t for t in targets if "screen=clips" in t.get("url", ""))


async def main() -> None:
    async with websockets.connect(page["webSocketDebuggerUrl"], max_size=20_000_000) as ws:
        nid = 0

        async def call(method: str, params: dict | None = None):
            nonlocal nid
            nid += 1
            await ws.send(json.dumps({"id": nid, "method": method, "params": params or {}}))
            while True:
                msg = json.loads(await ws.recv())
                if msg.get("id") == nid:
                    return msg.get("result")

        await call("Page.bringToFront")
        shot = await call("Page.captureScreenshot", {"format": "png", "fromSurface": True, "clip": {
            "x": 0, "y": 0, "width": 280, "height": 120, "scale": 1
        }})
        out = r"E:\Dev\Tool\P0001-Desk-Console\.runtime\brand-icon-verify.png"
        open(out, "wb").write(base64.b64decode(shot["data"]))
        print("wrote", out)


asyncio.run(main())
