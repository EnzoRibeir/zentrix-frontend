/**
 * Pós-build PWA para iOS (Safari Standalone / Tela de Início) e Android/Desktop.
 * Copia manifest.json + apple-touch-icon.png para dist/ e injeta meta tags Apple Web App.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const iconSrcPath = path.join(rootDir, 'assets', 'icon.png');
const iconDestPath = path.join(distDir, 'apple-touch-icon.png');
const manifestSrcPath = path.join(rootDir, 'public', 'manifest.json');
const manifestDestPath = path.join(distDir, 'manifest.json');

if (fs.existsSync(distDir)) {
  if (fs.existsSync(iconSrcPath)) {
    fs.copyFileSync(iconSrcPath, iconDestPath);
  }
  if (fs.existsSync(manifestSrcPath)) {
    fs.copyFileSync(manifestSrcPath, manifestDestPath);
  }
}

if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf-8');

  const pwaTags = `
    <meta name="theme-color" content="#274C77" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Zentrix" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  `;

  if (!html.includes('apple-mobile-web-app-capable')) {
    html = html.replace('</head>', `${pwaTags}\n  </head>`);
  }

  html = html.replace(
    /<meta name="viewport" content="([^"]*)"\s*\/?>/i,
    (match, content) => {
      if (content.includes('viewport-fit=cover')) return match;
      return `<meta name="viewport" content="${content}, viewport-fit=cover" />`;
    }
  );

  fs.writeFileSync(indexHtmlPath, html, 'utf-8');
  console.log('[PWA] dist/ preparado com manifest.json, apple-touch-icon.png e suporte standalone iOS!');
}
