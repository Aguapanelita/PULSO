import http.server
import socketserver
import threading
import subprocess
import time
import os
import tempfile

PORT = 8990
DIR = os.path.abspath(".")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)
    def log_message(self, format, *args):
        # print("[HTTP]", format % args)
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
    f"http://127.0.0.1:{PORT}/oir-la-luz-main/index.html"
]

print("Iniciando Edge headless en", f"http://127.0.0.1:{PORT}/oir-la-luz-main/index.html")
proc = subprocess.Popen(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)

time.sleep(5)
proc.terminate()
try:
    stdout, stderr = proc.communicate(timeout=3)
except Exception:
    proc.kill()
    stdout, stderr = proc.communicate()

httpd.shutdown()

print("=== LOGS DE EDGE ===")
err_lines = []
for line in stderr.splitlines():
    if "CONSOLE" in line or "error" in line.lower() or "exception" in line.lower():
        if "favicon" not in line and "voice" not in line.lower():
            err_lines.append(line)

if err_lines:
    print("Posibles errores detectados:")
    for l in err_lines[:20]:
        print(l)
else:
    print("No se detectaron errores críticos de consola o JavaScript.")
