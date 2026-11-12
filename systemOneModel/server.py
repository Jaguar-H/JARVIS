import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

from laya import Router

router = Router(preload=True)


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"ok": True, "model": "laya"})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/predict":
            return self._json(404, {"error": "not found"})
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            result = router.predict(body["state"], body["questions"])
            self._json(200, result)
        except Exception as e:
            self._json(400, {"error": str(e)})


if __name__ == "__main__":
    # Port 8000 is taken by the Jarvis server. In Docker, HOST is set to 0.0.0.0.
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8100"))
    HTTPServer((host, port), Handler).serve_forever()