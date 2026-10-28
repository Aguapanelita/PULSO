import http.server
import socketserver
import threading
import subprocess
import time
import urllib.parse
import os
import tempfile
import sys

PORT = 9123
DIR = os.path.abspath(".")
test_logs = []
done_event = threading.Event()

class TestServerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def log_message(self, format, *args):
        pass

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/test-log':
            params = urllib.parse.parse_qs(parsed.query)
            status = params.get('status', [''])[0]
            msg = params.get('msg', [''])[0]
            test_logs.append((status, msg))
            print(f"[{status}] {msg}", flush=True)
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')
        elif parsed.path == '/test-done':
            done_event.set()
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'DONE')
        else:
            super().do_GET()

httpd = socketserver.TCPServer(("127.0.0.1", PORT), TestServerHandler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
temp_dir = tempfile.mkdtemp()

cmd = [
    edge_path,
    "--headless=new",
    f"--user-data-dir={temp_dir}",
    "--disable-gpu",
    "--no-sandbox",
    f"http://127.0.0.1:{PORT}/oir-la-luz-main/tests.html"
]

print("=== LANZANDO PRUEBAS UNITARIAS DE PULSO EN EDGE HEADLESS ===", flush=True)
proc = subprocess.Popen(cmd)

finished = done_event.wait(timeout=15)

proc.terminate()
try:
    proc.wait(timeout=2)
except Exception:
    proc.kill()

httpd.shutdown()

print("\n=== RESUMEN DE PRUEBAS ===", flush=True)
print(f"Total pruebas recibidas: {len(test_logs)}", flush=True)
all_passed = len(test_logs) > 0 and all(st == 'PASS' for st, _ in test_logs)

if all_passed:
    print(">>> TODAS LAS PRUEBAS UNITARIAS Y DE INTEGRACION PASARON EXITOSAMENTE! <<<", flush=True)
    sys.exit(0)
else:
    print(">>> ALGUNAS PRUEBAS FALLARON O NO SE COMPLETARON A TIEMPO <<<", flush=True)
    sys.exit(1)
