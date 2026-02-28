/**
 * Post-export script: Injects PWA meta tags into dist/index.html
 * Usage: node scripts/inject-pwa-tags.js
 */
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found. Run "npx expo export --platform web" first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf-8');

const pwaTags = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="가계부" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />`;

// Replace lang="en" with lang="ko"
html = html.replace('<html lang="en">', '<html lang="ko">');

// Inject PWA tags before </head>
html = html.replace('</head>', `${pwaTags}\n  </head>`);

fs.writeFileSync(indexPath, html, 'utf-8');
console.log('PWA tags injected into dist/index.html');
