import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  base: "/instagram_gif_favouriter/",
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        discover: path.resolve(__dirname, 'discover.html'),
        favourites: path.resolve(__dirname, 'favourites.html'),
        toolbox: path.resolve(__dirname, 'toolbox.html'),
        users: path.resolve(__dirname, 'users.html'),
        profile: path.resolve(__dirname, 'profile.html'),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
