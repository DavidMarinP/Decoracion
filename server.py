#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor local para el Visor 3D y Gestor de Muebles.
Sirve archivos estáticos y proporciona endpoints para persistencia y captura rápida por URL.
"""

import http.server
import socketserver
import json
import os
import re
import urllib.request
import urllib.parse
from html import unescape

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = DIRECTORY
MUEBLES_FILE = os.path.join(DIRECTORY, "data", "muebles.json")

import socket

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

class DecoracionHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/muebles":
            self._handle_get_muebles()
            return
        elif parsed.path == "/api/info":
            local_ip = get_local_ip()
            self._set_headers(200)
            self.wfile.write(json.dumps({
                "local_ip": local_ip,
                "port": PORT,
                "url": f"http://{local_ip}:{PORT}"
            }).encode("utf-8"))
            return
        elif parsed.path.startswith("/imagenes_muebles/"):
            # Compatibilidad hacia atrás: redirigir a assets/imagenes_muebles/
            new_path = "/assets" + parsed.path
            self.send_response(301)
            self.send_header("Location", new_path)
            self.end_headers()
            return
        # Servir archivos estáticos normales
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/muebles":
            self._handle_post_muebles()
        elif parsed.path == "/api/scrape":
            self._handle_scrape()
        elif parsed.path == "/api/download-image":
            self._handle_download_image()
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Ruta no encontrada"}).encode("utf-8"))

    def _handle_get_muebles(self):
        try:
            if not os.path.exists(MUEBLES_FILE):
                with open(MUEBLES_FILE, "w", encoding="utf-8") as f:
                    json.dump([], f)
            with open(MUEBLES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._set_headers(200)
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    def _handle_post_muebles(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            data = json.loads(body)
            with open(MUEBLES_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "ok", "count": len(data)}).encode("utf-8"))
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    def _fetch_html(self, target_url):
        # 1. Intentar con curl.exe nativo de Windows (maneja Cloudflare, HTTP/2 y certificados modernos)
        try:
            import subprocess
            cmd = [
                "curl.exe", "-s", "-L", "-m", "15",
                "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "-H", "Accept-Language: es-ES,es;q=0.9,en;q=0.8,it;q=0.7",
                target_url
            ]
            res = subprocess.run(cmd, capture_output=True, timeout=16)
            if res.returncode == 0 and res.stdout:
                try:
                    return res.stdout.decode("utf-8")
                except UnicodeDecodeError:
                    return res.stdout.decode("latin-1", errors="ignore")
        except Exception:
            pass

        # 2. Fallback con urllib
        req = urllib.request.Request(
            target_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "es-ES,es;q=0.9,en;q=0.8,it;q=0.7"
            }
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            try:
                return data.decode("utf-8")
            except UnicodeDecodeError:
                return data.decode("latin-1", errors="ignore")

    def _download_image(self, img_url, name_hint=""):
        if not img_url or not img_url.startswith("http"):
            return img_url
        try:
            img_dir = os.path.join(ROOT_DIR, "assets", "imagenes_muebles")
            os.makedirs(img_dir, exist_ok=True)

            safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', name_hint.lower()).strip('_')
            if not safe_name:
                safe_name = "mueble"
            safe_name = safe_name[:40]

            parsed = urllib.parse.urlparse(img_url)
            ext = os.path.splitext(parsed.path)[1].lower()
            if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]:
                ext = ".jpg"

            import hashlib
            h = hashlib.md5(img_url.encode("utf-8")).hexdigest()[:8]
            filename = f"{safe_name}_{h}{ext}"
            file_path = os.path.join(img_dir, filename)
            rel_path = f"assets/imagenes_muebles/{filename}"

            if os.path.exists(file_path) and os.path.getsize(file_path) > 1000:
                return rel_path

            import subprocess
            cmd = [
                "curl.exe", "-s", "-L", "-m", "15",
                "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                img_url, "-o", file_path
            ]
            res = subprocess.run(cmd, capture_output=True, timeout=16)
            if res.returncode == 0 and os.path.exists(file_path) and os.path.getsize(file_path) > 500:
                print(f"[Image Downloaded] Guardada localmente en {rel_path} ({os.path.getsize(file_path)} bytes)")
                return rel_path

            req = urllib.request.Request(img_url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
                if len(data) > 500:
                    with open(file_path, "wb") as f_out:
                        f_out.write(data)
                    print(f"[Image Downloaded urllib] Guardada localmente en {rel_path}")
                    return rel_path
        except Exception as e:
            print(f"[Image Download Warning] No se pudo descargar imagen {img_url}: {e}")
        return img_url

    def _handle_download_image(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(body)
            img_url = payload.get("url", "").strip()
            name = payload.get("nombre", "mueble")
            if not img_url:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "URL de imagen requerida"}).encode("utf-8"))
                return
            local_path = self._download_image(img_url, name)
            self._set_headers(200)
            self.wfile.write(json.dumps({"imagen": local_path}).encode("utf-8"))
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    def _handle_scrape(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(body)
            target_url = payload.get("url", "").strip()

            if not target_url or not target_url.startswith("http"):
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "URL no válida"}).encode("utf-8"))
                return

            html_content = ""
            try:
                html_content = self._fetch_html(target_url)
            except Exception as e:
                print(f"[Scrape Warning] Fetch falló para {target_url}: {e}")

            info = self._parse_html(html_content, target_url)

            # Descargar imagen automáticamente al disco local para evitar bloqueos por hotlink/CORS
            if info.get("imagen") and info["imagen"].startswith("http"):
                info["imagen_remota"] = info["imagen"]
                local_img = self._download_image(info["imagen"], info.get("nombre", ""))
                info["imagen"] = local_img

            self._set_headers(200)
            self.wfile.write(json.dumps(info, ensure_ascii=False).encode("utf-8"))
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    def _parse_html(self, html, url):
        parsed_url = urllib.parse.urlparse(url)
        domain = parsed_url.netloc.replace("www.", "")

        # Normalizar nombres de tiendas populares
        tienda = domain.split(".")[0].capitalize() if domain else "Tienda Web"
        d_lower = domain.lower()
        if "devina" in d_lower:
            tienda = "Devina Nais"
        elif "kave" in d_lower:
            tienda = "Kave Home"
        elif "ikea" in d_lower:
            tienda = "IKEA"
        elif "maisons" in d_lower:
            tienda = "Maisons du Monde"
        elif "sklum" in d_lower:
            tienda = "Sklum"
        elif "zara" in d_lower:
            tienda = "Zara Home"
        elif "porada" in d_lower:
            tienda = "Porada"
        elif "albidecor" in d_lower:
            tienda = "Albidecor"
        elif "elcorteingles" in d_lower:
            tienda = "El Corte Inglés"

        title = ""
        image = ""
        precio = 0.0
        ancho = 0.0
        fondo = 0.0
        alto = 0.0

        raw_html = html or ""
        clean_html = unescape(raw_html)

        # 1. Intentar con JSON-LD (Schema.org) - Estándar en Magento, Shopify, WooCommerce
        json_ld_blocks = re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', raw_html, re.DOTALL | re.IGNORECASE)
        for block in json_ld_blocks:
            try:
                data = json.loads(block.strip())
                items = []
                if isinstance(data, list):
                    items = data
                elif isinstance(data, dict):
                    if "@graph" in data and isinstance(data["@graph"], list):
                        items = data["@graph"]
                    else:
                        items = [data]

                for item in items:
                    if not isinstance(item, dict):
                        continue
                    t = item.get("@type", "")
                    if t == "Product" or (isinstance(t, list) and "Product" in t):
                        if not title and item.get("name"):
                            title = str(item.get("name")).strip()

                        if not image:
                            img_val = item.get("image")
                            if isinstance(img_val, str) and img_val.strip():
                                image = img_val.strip()
                            elif isinstance(img_val, list) and img_val:
                                first = img_val[0]
                                if isinstance(first, str):
                                    image = first.strip()
                                elif isinstance(first, dict) and "url" in first:
                                    image = first["url"].strip()
                            elif isinstance(img_val, dict):
                                image = (img_val.get("url") or img_val.get("contentUrl") or "").strip()

                        if precio == 0 and "offers" in item:
                            offers = item["offers"]
                            if isinstance(offers, dict):
                                p = offers.get("price") or offers.get("lowPrice")
                                if p:
                                    try:
                                        precio = float(str(p).replace(",", "."))
                                    except ValueError:
                                        pass
                            elif isinstance(offers, list) and offers:
                                p = offers[0].get("price") or offers[0].get("lowPrice")
                                if p:
                                    try:
                                        precio = float(str(p).replace(",", "."))
                                    except ValueError:
                                        pass
            except Exception:
                continue

        # Helper para extraer atributos de tags <meta ...> soportando saltos de línea y cualquier orden
        def get_meta_attr(name_or_prop):
            pattern = rf'<meta\s+[^>]*?(?:property|name|itemprop)=["\']{re.escape(name_or_prop)}["\'][^>]*?>'
            for tag in re.finditer(pattern, raw_html, re.IGNORECASE | re.DOTALL):
                tag_str = tag.group(0)
                m_content = re.search(r'content=["\']([^"\']*)["\']', tag_str, re.IGNORECASE | re.DOTALL)
                if m_content and m_content.group(1).strip():
                    return m_content.group(1).strip()

            pattern_rev = rf'<meta\s+[^>]*?content=["\']([^"\']+)["\'][^>]*?(?:property|name|itemprop)=["\']{re.escape(name_or_prop)}["\'][^>]*?>'
            m_rev = re.search(pattern_rev, raw_html, re.IGNORECASE | re.DOTALL)
            if m_rev:
                return m_rev.group(1).strip()
            return ""

        # 2. Título (fallback si no vino en JSON-LD)
        if not title:
            title = get_meta_attr("og:title") or get_meta_attr("twitter:title")
            if not title:
                m_t = re.search(r'<title[^>]*>(.*?)</title>', raw_html, re.IGNORECASE | re.DOTALL)
                if m_t:
                    title = m_t.group(1).strip()
            if title:
                title = unescape(title)
                title = re.sub(r'\s*[-|•]\s*(Albidecor|DevinaNais|Devina Nais|IKEA|Kave Home|Sklum|Maisons du Monde|Zara Home|Amazon|El Corte Inglés).*$', '', title, flags=re.I).strip()

        if not title:
            slug = [p for p in parsed_url.path.strip("/").split("/") if p]
            if slug:
                last_slug = slug[-1].replace(".html", "").replace(".htm", "").replace("-", " ").replace("_", " ").capitalize()
                title = last_slug

        # 3. Imagen (fallback si no vino en JSON-LD)
        if not image:
            image = (
                get_meta_attr("og:image") or
                get_meta_attr("og:image:secure_url") or
                get_meta_attr("twitter:image") or
                get_meta_attr("twitter:image:src") or
                get_meta_attr("image")
            )

        if not image:
            m_link = re.search(r'<link\s+[^>]*?rel=["\']image_src["\'][^>]*?href=["\']([^"\']+)["\']', raw_html, re.I | re.DOTALL)
            if m_link:
                image = m_link.group(1).strip()

        if not image:
            m_catalog = re.search(r'["\'](https?://[^"\']*/media/catalog/product/[^"\']+\.(?:jpg|jpeg|png|webp))["\']', raw_html, re.I)
            if m_catalog:
                image = m_catalog.group(1)

        if image:
            if image.startswith("//"):
                image = "https:" + image
            elif image.startswith("/"):
                image = f"{parsed_url.scheme}://{parsed_url.netloc}{image}"

        # 4. Precio (fallback si no vino en JSON-LD)
        if precio == 0:
            p_str = get_meta_attr("product:price:amount") or get_meta_attr("price")
            if p_str:
                try:
                    precio = float(p_str.replace(",", "."))
                except ValueError:
                    pass

        if precio == 0:
            m_dp = re.search(r'data-price-amount=["\']([0-9]+(?:\.[0-9]+)?)["\']', raw_html)
            if m_dp:
                try:
                    precio = float(m_dp.group(1))
                except ValueError:
                    pass

        if precio == 0:
            m_price = re.search(r'"price":\s*"?([0-9]+(?:\.[0-9]+)?)"?', raw_html, re.I)
            if m_price:
                try:
                    precio = float(m_price.group(1).replace(",", "."))
                except ValueError:
                    pass

        if precio == 0:
            m_price_txt = re.search(r'([0-9]{1,4}(?:[.,][0-9]{2})?)\s*€', clean_html)
            if m_price_txt:
                try:
                    precio = float(m_price_txt.group(1).replace(".", "").replace(",", "."))
                except ValueError:
                    pass

        # 5. Categoría sugerida
        cat = "sofas"
        text_detect = f"{url} {title}".lower()
        if any(k in text_detect for k in ["sedia", "silla", "chair", "taburete", "stool"]):
            cat = "sillas"
        elif any(k in text_detect for k in ["tavolo", "mesa", "table", "comedor", "pranzo"]) and not any(k in text_detect for k in ["centro", "salotto", "coffee", "baja", "noche"]):
            cat = "mesas_comedor"
        elif any(k in text_detect for k in ["divano", "sofa", "sofá", "chaise", "sillón", "poltrona"]):
            cat = "sofas"
        elif any(k in text_detect for k in ["libreria", "librería", "estanteria", "estantería", "bookcase", "shelf"]):
            cat = "librerias"
        elif any(k in text_detect for k in ["tv", "aparador", "sideboard", "credenza", "buffet"]):
            cat = "muebles_tv"
        elif any(k in text_detect for k in ["centro", "salotto", "coffee", "baja", "auxiliar"]):
            cat = "mesas_centro"
        elif any(k in text_detect for k in ["lampada", "lámpara", "lampara", "lamp", "foco", "luz"]):
            cat = "iluminacion"

        # 6. Dimensiones (Ancho, Fondo/Profundo, Alto en cm)
        m_dim_named = re.search(
            r'(?:Ancho|Width|Largo|L)\s*[:\s]*([0-9]+(?:\.[0-9]+)?)\s*(?:cm)?\s*'
            r'(?:Profundo|Profundidad|Fondo|Depth|P)\s*[:\s]*([0-9]+(?:\.[0-9]+)?)\s*(?:cm)?\s*'
            r'(?:Alto|Altura|Height|H)\s*[:\s]*([0-9]+(?:\.[0-9]+)?)\s*(?:cm)?',
            clean_html, re.I
        )
        if m_dim_named:
            try:
                ancho = float(m_dim_named.group(1))
                fondo = float(m_dim_named.group(2))
                alto = float(m_dim_named.group(3))
            except ValueError:
                pass

        if ancho == 0:
            m_lph = re.search(r'\bL\s*[:\s]*([0-9]{2,3})\s*(?:cm)?\s*P\s*[:\s]*([0-9]{2,3})\s*(?:cm)?\s*H\s*[:\s]*([0-9]{2,3})\s*(?:cm)?\b', clean_html, re.I)
            if m_lph:
                try:
                    ancho = float(m_lph.group(1))
                    fondo = float(m_lph.group(2))
                    alto = float(m_lph.group(3))
                except ValueError:
                    pass

        if ancho == 0:
            m_dims = re.search(r'([0-9]{2,3})\s*(?:x|×)\s*([0-9]{2,3})\s*(?:x|×)\s*([0-9]{2,3})\s*(?:cm)?', clean_html, re.I)
            if m_dims:
                try:
                    ancho = float(m_dims.group(1))
                    fondo = float(m_dims.group(2))
                    alto = float(m_dims.group(3))
                except ValueError:
                    pass

        return {
            "nombre": title,
            "imagen": image,
            "precio": precio,
            "tienda": tienda,
            "categoria": cat,
            "ancho": ancho,
            "fondo": fondo,
            "alto": alto,
            "url": url
        }

if __name__ == "__main__":
    handler = DecoracionHandler
    # Permitir reusar dirección inmediatamente
    socketserver.TCPServer.allow_reuse_address = True
    local_ip = get_local_ip()
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print("=" * 60)
        print("  ESTUDIO DECORACION 3D - SERVIDOR LOCAL")
        print("=" * 60)
        print(f" [PC]    Navegador local:      http://localhost:{PORT}")
        print(f" [MOVIL] En el mismo Wi-Fi:   http://{local_ip}:{PORT}")
        print(" (Abre la URL del móvil en Chrome o Safari sin conectar cables)")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nDeteniendo servidor.")
