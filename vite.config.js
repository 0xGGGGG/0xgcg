import { defineConfig } from 'vite'

export default defineConfig({
  // SPA — client-side views at /, /core (Timeline), /layout, /script
  appType: 'spa',
  resolve: {
    // the source uses the importmap-style `three/addons/` specifier; map it to
    // the npm package's examples so no source edits are needed
    alias: {
      'three/addons/': 'three/examples/jsm/',
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
