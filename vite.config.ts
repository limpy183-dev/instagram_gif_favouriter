import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: "/instagram_gif_favouriter/",
  plugins: [react(), tailwindcss()],
  // Strip console/debugger from the production bundle only, so dev keeps its
  // logs but shipped code never leaks keys/diagnostics to the console.
  esbuild: command === "build" ? { drop: ["console", "debugger"] } : {},
  build: {
    target: "es2020",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        discover: path.resolve(__dirname, 'discover.html'),
        favourites: path.resolve(__dirname, 'favourites.html'),
        toolbox: path.resolve(__dirname, 'toolbox.html'),
        users: path.resolve(__dirname, 'users.html'),
        profile: path.resolve(__dirname, 'profile.html'),
      },
      output: {
        // Split heavy, rarely-changing vendor code into its own long-cacheable
        // chunks instead of one monolithic bundle.
        manualChunks: {
          react: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
}));
