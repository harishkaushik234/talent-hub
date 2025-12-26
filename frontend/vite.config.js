import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const parts = id.split("node_modules/")[1];
          if (!parts) return "vendor";
          const pkg = parts.startsWith("@") ? parts.split("/").slice(0, 2).join("/") : parts.split("/")[0];
          // keep very common react libs grouped
          if (pkg === "react" || pkg === "react-dom") return "react-vendor";
          return pkg.replace("@", "").replace("/", "-");
        },
      },
    },
  },
});
