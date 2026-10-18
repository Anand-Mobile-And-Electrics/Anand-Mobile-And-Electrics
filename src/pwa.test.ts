import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('PWA configuration', () => {
  it('references real branded icon assets', () => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8')) as { icons: { src: string }[] };
    for (const icon of manifest.icons) expect(existsSync(resolve(root, `public${icon.src}`))).toBe(true);
  });

  it('keeps private and non-GET requests out of the service-worker cache', () => {
    const sw = readFileSync(resolve(root, 'public/sw.js'), 'utf8');
    expect(sw).toContain("req.method !== 'GET'");
   expect(sw).toContain('url.origin !== self.location.origin');
    expect(sw).toContain('isStaticAsset');
    expect(sw).toContain("req.mode === 'navigate'");
  });

  it('build output contains the generated precache manifest and route chunks', () => {
    const manifest = resolve(root, 'dist/precache-manifest.js');
    expect(existsSync(manifest)).toBe(true);
    const source = readFileSync(manifest, 'utf8');
    expect(source).toContain('Inventory-');
    expect(source).toContain('.css');
  });

  it('keeps the manifest and service worker as real assets, not HTML fallbacks', () => {
    const manifest = readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8');
    const serviceWorker = readFileSync(resolve(root, 'public/sw.js'), 'utf8');
    expect(() => JSON.parse(manifest)).not.toThrow();
    expect(manifest.trimStart().startsWith('<!doctype html')).toBe(false);
    expect(serviceWorker).toContain("self.addEventListener('fetch'");
    expect(serviceWorker.trimStart().startsWith('<!doctype html')).toBe(false);
  });

  it('configures vercel.json rewrite regex to exclude file extensions and preserve SPA routes', () => {
    const vercelConfig = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8')) as {
      rewrites?: { source: string; destination: string }[];
    };
    expect(vercelConfig.rewrites).toBeDefined();
    const spaRewrite = vercelConfig.rewrites?.find((r) => r.destination === '/index.html');
    expect(spaRewrite).toBeDefined();

    const regex = new RegExp(`^${spaRewrite!.source}$`);
    // Static assets with extensions must NOT match the rewrite to /index.html
    expect(regex.test('/manifest.webmanifest')).toBe(false);
    expect(regex.test('/sw.js')).toBe(false);
    expect(regex.test('/precache-manifest.js')).toBe(false);
    expect(regex.test('/icon-192.png')).toBe(false);
    expect(regex.test('/icon-512.png')).toBe(false);
    expect(regex.test('/favicon.svg')).toBe(false);
    expect(regex.test('/assets/index.js')).toBe(false);
    expect(regex.test('/assets/index.css')).toBe(false);

    // SPA routes without file extensions MUST match the rewrite to /index.html
    expect(regex.test('/')).toBe(true);
    expect(regex.test('/admin')).toBe(true);
    expect(regex.test('/admin/login')).toBe(true);
    expect(regex.test('/admin/inventory')).toBe(true);
    expect(regex.test('/admin/repairs')).toBe(true);
    expect(regex.test('/about')).toBe(true);
    expect(regex.test('/services')).toBe(true);
    expect(regex.test('/contact')).toBe(true);
  });
});
