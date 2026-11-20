import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: {
    // Izinkan memuat kode bersama di ../shared (dipakai juga oleh server).
    fs: { allow: [".."] },
    // API akun dilayani server game; lewat proxy supaya cookie sesi tetap di alamat yang sama.
    proxy: { "/api": "http://localhost:2567" },
  },
  preview: {
    proxy: { "/api": "http://localhost:2567" },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        orangtua: resolve(import.meta.dirname, "orangtua.html"),
      },
    },
  },
});
