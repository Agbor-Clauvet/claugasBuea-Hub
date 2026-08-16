import { defineConfig } from "vitest/config";
import viteReact from "@vitejs/plugin-react";
import path from "node:path";

// Deliberately NOT reusing vite.config.ts here: that file wires up
// TanStack Start's SSR plugin and the Nitro build preset, neither of
// which unit tests need or want running. This config only needs the
// React plugin (for any component tests) and the same "@" path alias
// used throughout the app, so imports like "@/lib/delivery-fee" resolve
// the same way in tests as they do in the real app.
export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
