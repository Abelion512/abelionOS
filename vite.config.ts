import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// PWA tanpa plugin: manifest, ikon, dan sw.js (dengan handler push) statis
// di public/; registrasi SW manual setelah izin push di-enable pengguna.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 8080,
    hmr: false,
    // Browser preview (domain publik) tak dapat menjangkau 127.0.0.1:3210;
    // WebSocket + HTTP Convex diproxy lewat origin preview ini.
    // Urutan penting: HTTP actions Convex (route /api/google/*) dilayani di site
    // port 3211, sedangkan query/mutation/action/websocket di client port 3210.
    proxy: {
      "/api/google": {
        target: "http://127.0.0.1:3211",
        changeOrigin: true,
      },
      "/api": {
        target: "http://127.0.0.1:3210",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
