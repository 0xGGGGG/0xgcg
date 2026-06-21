#!/usr/bin/env python3
"""Tiny static dev server with SPA fallback.

Plain `python3 -m http.server` 404s on app routes like /layout. This serves
real files normally and falls back to index.html for extensionless app routes
(/, /core, /layout), so deep links and refreshes work.

    python3 serve.py [port]   # default 8000
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler
from socketserver import ThreadingTCPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def send_head(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        rel = path.lstrip("/")
        disk = os.path.join(ROOT, rel)
        # Serve index.html for app routes (no file extension, not a real file).
        if not os.path.isfile(disk) and "." not in os.path.basename(path):
            self.path = "/index.html"
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # always fresh in dev
        super().end_headers()


ThreadingTCPServer.allow_reuse_address = True
with ThreadingTCPServer(("", PORT), Handler) as httpd:
    print(f"0xGCG dev server  →  http://localhost:{PORT}  (SPA fallback on)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
