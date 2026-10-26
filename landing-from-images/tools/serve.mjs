import http from 'node:http';
import path from 'node:path';
import { realpath, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { main, number, parseArgs } from './lib/cli.mjs';

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json'
};

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

export async function startServer({ root = '.', port = 0 } = {}) {
  const base = await realpath(path.resolve(root));
  if (!(await stat(base)).isDirectory()) throw new Error('A raiz deve ser uma pasta.');
  const server = http.createServer(async (request, response) => {
    const fail = (status, message) => { response.writeHead(status, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); response.end(message); };
    try {
      if (!/^127\.0\.0\.1:\d+$/.test(request.headers.host || '')) return fail(403, 'Host não permitido');
      if (!['GET', 'HEAD'].includes(request.method)) return fail(405, 'Somente GET/HEAD');
      const urlPath = decodeURIComponent((request.url || '/').split('?')[0]);
      if (!urlPath.startsWith('/') || /[\\\u0000:]/.test(urlPath)) return fail(403, 'Caminho não permitido');
      const segments = urlPath.split('/').filter(Boolean);
      if (segments.some(segment => segment.startsWith('.') || ['node_modules', 'package.json', 'package-lock.json'].includes(segment))) {
        return fail(403, 'Caminho não permitido');
      }
      let file = path.resolve(base, `.${urlPath}`);
      if (!inside(base, file)) return fail(403, 'Fora da raiz');
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      file = await realpath(file);
      if (!inside(base, file)) return fail(403, 'Link fora da raiz');
      const info = await stat(file);
      if (!info.isFile()) return fail(404, 'Arquivo não encontrado');
      const type = types[path.extname(file).toLowerCase()];
      if (!type) return fail(403, 'Tipo não publicado');
      response.writeHead(200, { 'Content-Type': type, 'Content-Length': info.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      if (request.method === 'HEAD') return response.end();
      const stream = createReadStream(file);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    } catch (error) {
      if (error instanceof URIError) return fail(400, 'URL inválida');
      fail(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500, 'Arquivo indisponível');
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); })
  };
}

main(import.meta.url, async () => {
  const { options, files } = parseArgs(process.argv.slice(2), ['root', 'port']);
  if (files.length) throw new Error('Use --root <pasta> --port <porta>.');
  const server = await startServer({ root: options.root || '.', port: number(options.port || 4173, 'port', { min: 0, max: 65535 }) });
  console.log(`Preview local: ${server.url} (Ctrl+C para encerrar)`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); });
});
