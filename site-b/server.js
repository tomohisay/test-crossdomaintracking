const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3002;
const SITE_NAME = 'Site B (Domain B)';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`[${SITE_NAME}] ${req.method} ${req.url}`);

  let filePath = req.url === '/' ? '/index.html' : req.url;

  // Remove query string for file lookup
  filePath = filePath.split('?')[0];

  // Check public directory first, then shared
  let fullPath = path.join(__dirname, 'public', filePath);

  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(__dirname, '..', 'shared', filePath);
  }

  const ext = path.extname(fullPath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[${SITE_NAME}] Server running at http://localhost:${PORT}/`);
});
