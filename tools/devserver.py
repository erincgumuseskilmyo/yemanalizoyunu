"""Gelistirme sunucusu: onbellek kapali, es zamanli istekleri karsilar."""
import sys, os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()
    def log_message(self, fmt, *args):
        if '200' not in (args[1] if len(args) > 1 else ''):
            super().log_message(fmt, *args)

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8124
print(f'Yem Laboratuvari -> http://localhost:{port}  ({ROOT})', flush=True)
ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
