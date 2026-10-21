import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const precacheManifest = (): Plugin => ({
  name: 'emit-pwa-precache-manifest',
  generateBundle(_, bundle) {
    const assets = Object.keys(bundle).filter((name) => /\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(name))
    this.emitFile({ type: 'asset', fileName: 'precache-manifest.js', source: `self.__ANAND_PRECACHE = ${JSON.stringify(assets)};` })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), precacheManifest()],
})
