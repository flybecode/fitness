"""Lokaler Entwicklungsserver ohne Browser-Cache, damit Änderungen sofort sichtbar sind.

Aufruf: python3 werkzeuge/server.py [port]
Im selben WLAN ist die App dann auch vom iPhone über http://<IP-des-Macs>:<port> erreichbar.
"""
import functools
import http.server
import sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / "app"


class OhneCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8790
    handler = functools.partial(OhneCache, directory=str(APP))
    print(f"Fitness läuft auf http://localhost:{port}")
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
