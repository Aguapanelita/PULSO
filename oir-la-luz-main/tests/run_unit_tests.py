import http.server
import socketserver
import threading
import subprocess
import time
import os
import tempfile

PORT = 8995
DIR = os.path.abspath(".")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)
    def log_message(self, format, *args):
        pass

httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
server_thread.start()

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
temp_dir = tempfile.mkdtemp()

cmd = [
    edge_path,
    "--headless=new",
    f"--user-data-dir={temp_dir}",
    "--disable-gpu",
    "--no-sandbox",
    "--enable-logging=stderr",
    "--v=1",
    f"http://127.0.0.1:{PORT}/oir-la-luz-main/tests.html"
]

print("Ejecutando suite de pruebas unitarias en Edge headless...")
proc = subprocess.Popen(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)

time.sleep(6)
proc.terminate()
try:
    stdout, stderr = proc.communicate(timeout=3)
except Exception:
    proc.kill()
    stdout, stderr = proc.communicate()

httpd.shutdown()

print("=== RESULTADOS DEL TEST RUNNER EN CONSOLA ===")
results = []
for line in stderr.splitlines():
    if "[PASS]" in line or "[FAIL]" in line or "PRUEBAS" in line:
        results.append(line)

for r in results:
    # Limpiar prefijo de timestamp de chromium
    if "CONSOLE" in r:
        idx = r.find("CONSOLE")
        print(r[idx:])
    else:
        print(r)
