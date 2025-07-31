import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore']
          }
        }
      }
    },
    server: {
      port: 3000,
      strictPort: true,
      headers: {
        'Content-Security-Policy': `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co;
          style-src 'self' 'unsafe-inline';
          img-src 'self' data:;
          connect-src 'self' 
            https://*.firebaseio.com 
            https://*.firestore.googleapis.com 
            https://*.googleapis.com 
            wss://*.firebaseio.com 
            wss://*.firestore.googleapis.com;
          font-src 'self';
          object-src 'none';
          media-src 'self';
          frame-src 'none';
        `.replace(/\s+/g, ' ').trim()
      },
      proxy: {
        '/api/hibp': {
          target: 'https://api.pwnedpasswords.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/hibp/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              proxyReq.setHeader('User-Agent', 'CypherVault-Password-Checker');
              proxyReq.setHeader('Add-Padding', 'true');
            });
          }
        }
      }
    },
    preview: {
      port: 3000,
      strictPort: true,
      headers: {
        'Content-Security-Policy': `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co;
          style-src 'self' 'unsafe-inline';
          img-src 'self' data:;
          connect-src 'self' 
            https://*.firebaseio.com 
            https://*.firestore.googleapis.com 
            https://*.googleapis.com 
            wss://*.firebaseio.com 
            wss://*.firestore.googleapis.com;
          font-src 'self';
          object-src 'none';
          media-src 'self';
          frame-src 'none';
        `.replace(/\s+/g, ' ').trim()
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    }
  };
});
