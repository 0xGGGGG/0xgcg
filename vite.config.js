import { defineConfig } from 'vite'

// serve /sandbox and /sandbox/<mode> from sandbox.html (deep-linkable modes)
const sandboxRoutes = {
  name: 'sandbox-routes',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/sandbox' || req.url.startsWith('/sandbox/')) req.url = '/sandbox.html'
      next()
    })
  },
}

export default defineConfig({
  // SPA — client-side views at /, /core (Timeline), /layout, /script · /sandbox lab
  appType: 'spa',
  plugins: [sandboxRoutes],
  resolve: {
    // the source uses the importmap-style `three/addons/` specifier; map it to
    // the npm package's examples so no source edits are needed
    alias: {
      'three/addons/': 'three/examples/jsm/',
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        sandbox: new URL('./sandbox.html', import.meta.url).pathname, // /sandbox — growth lab
      },
    },
  },
})
