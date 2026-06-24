"""
Dev server for Memi Abbigliamento.
Serves extensionless URLs by appending .html (e.g. /shop → shop.html).
Run: python server.py [port]
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3456


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Strip query string to find the file path
        path = self.path.split('?')[0].rstrip('/')

        # Try the path as-is first (handles /index.html, /tokens.css, etc.)
        fs_path = self.translate_path(path)

        if not os.path.exists(fs_path):
            # Try appending .html (handles /shop → shop.html)
            html_path = self.translate_path(path + '.html')
            if os.path.isfile(html_path):
                self.path = path + '.html' + ('?' + self.path.split('?', 1)[1] if '?' in self.path else '')
        elif os.path.isdir(fs_path):
            # Directory: look for index.html inside it
            index = os.path.join(fs_path, 'index.html')
            if os.path.isfile(index):
                self.path = path + '/index.html' + ('?' + self.path.split('?', 1)[1] if '?' in self.path else '')

        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        # Suppress 404 spam for favicon; print everything else
        if len(args) >= 2 and '404' in str(args[1]) and 'favicon' in str(args[0]):
            return
        super().log_message(fmt, *args)


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with http.server.HTTPServer(('', PORT), Handler) as httpd:
        print(f'Memi dev server -> http://localhost:{PORT}')
        httpd.serve_forever()
