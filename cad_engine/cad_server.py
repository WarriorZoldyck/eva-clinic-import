#!/usr/bin/env python3
"""
Eva Clinic — Servidor de API Local para Geração de Guias Cirúrgicos CAD
Porta: 8005
Endpoints:
  GET  /health
  POST /api/generate-guide
  GET  /api/download-sample-arch
"""

import sys
import os
import json
import base64
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

# Importa o motor CAD local
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from surgical_guide_generator import build_guide, generate_sample_mandible_arch

PORT = 8005

class CadApiHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/health':
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            resp = {
                "status": "online",
                "engine": "Eva Clinic Marching Cubes CAD Engine",
                "version": "1.0.0",
                "watertight_supported": True
            }
            self.wfile.write(json.dumps(resp).encode('utf-8'))
            return

        if parsed.path == '/api/download-sample-arch':
            arch_file = os.path.join(os.path.dirname(__file__), "arcada_modelo_mandibula.stl")
            if not os.path.exists(arch_file):
                generate_sample_mandible_arch(arch_file)
            
            with open(arch_file, 'rb') as f:
                data = f.read()
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/sla')
            self.send_header('Content-Disposition', 'attachment; filename="arcada_modelo_mandibula.stl"')
            self.end_headers()
            self.wfile.write(data)
            return

        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/generate-guide':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                params = json.loads(body) if body else {}
            except Exception:
                params = {}

            site_xy = params.get('site_xy', [-18.0, -20.0])
            radius = float(params.get('radius', 18.0))
            thickness = float(params.get('thickness', 2.5))
            gap = float(params.get('gap', 0.12))
            hole_d = float(params.get('hole_d', 5.0))
            sleeve_od = float(params.get('sleeve_od', 7.5))
            sleeve_h = float(params.get('sleeve_h', 5.0))
            sleeve_offset = float(params.get('sleeve_offset', 9.0))
            res = float(params.get('res', 0.22))
            tooth = str(params.get('tooth', '36'))
            inspection_windows = bool(params.get('inspection_windows', True))

            arch_file = os.path.join(os.path.dirname(__file__), "arcada_modelo_mandibula.stl")
            if not os.path.exists(arch_file):
                generate_sample_mandible_arch(arch_file)

            out_file = os.path.join(os.path.dirname(__file__), f"guia_cirurgico_dente_{tooth}.stl")

            try:
                result = build_guide(
                    stl_path=arch_file,
                    site_xy=site_xy,
                    radius=radius,
                    thickness=thickness,
                    gap=gap,
                    hole_d=hole_d,
                    sleeve_od=sleeve_od,
                    sleeve_h=sleeve_h,
                    sleeve_offset=sleeve_offset,
                    inspection_windows=inspection_windows,
                    res=res,
                    out=out_file
                )

                # Lê o arquivo STL para envio em Base64
                with open(out_file, 'rb') as f:
                    stl_bytes = f.read()
                stl_b64 = base64.b64encode(stl_bytes).decode('ascii')

                result['stl_base64'] = stl_b64
                result['filename'] = f"guia_cirurgico_dente_{tooth}.stl"

                self.send_response(200)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()

def run_server():
    server = HTTPServer(('127.0.0.1', PORT), CadApiHandler)
    print(f"[+] Eva Clinic CAD API Server ativo em: http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Encerrando servidor CAD...")
        server.server_close()

if __name__ == '__main__':
    run_server()
