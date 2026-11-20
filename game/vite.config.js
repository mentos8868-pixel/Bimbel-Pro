import { defineConfig } from "vite";
import { resolve } from "node:path";

// Port server game bisa diganti lewat GAME_SERVER_PORT (sama seperti server/index.js).
const API = `http://localhost:${process.env.GAME_SERVER_PORT || 2567}`;

export default defineConfig({
  server: {
    // Izinkan memuat kode bersama di ../shared (dipakai juga oleh server).
    fs: { allow: [".."] },
    // API akun dilayani server game; lewat proxy supaya cookie sesi tetap di alamat yang sama.
    proxy: { "/api": API },
  },
  preview: {
    proxy: { "/api": API },
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
