// This project previously used @lovable.dev/vite-tanstack-config, a wrapper
// package that bundled the plugins below plus a set of Lovable-IDE-only
// tools (visual editor tagging, sandbox dev-server bridging, HMR error
// reporting) that only matter inside Lovable's own hosted editor and are
// irrelevant now that this project is developed and deployed independently.
//
// This file replicates every plugin that actually affected local dev or the
// production build, dropping only the Lovable-sandbox-only tooling.
import { defineConfig, loadEnv, type PluginOption, type UserConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(async ({ mode, command }): Promise<UserConfig> => {
  // Inline VITE_*-prefixed env vars at build time, same as before.
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const plugins: PluginOption[] = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
  ];

  // Nitro only ever ran during `vite build`, never during `vite dev` — match
  // that exactly. Hard-pinned to the Vercel preset: this project deploys on
  // Vercel, not Cloudflare, and an unpinned/default preset breaks server-side
  // dynamic routes (e.g. /orders/$id) once deployed.
  if (command === "build") {
    const { nitro } = await import("nitro/vite");
    plugins.push(nitro({ preset: "vercel" }));
  }

  plugins.push(viteReact());

  return {
    define: envDefine,
    // Match the build's CSS pipeline in dev (Vite uses PostCSS in dev but
    // Lightning CSS at build by default) so dev preview matches production.
    css: { transformer: "lightningcss" },
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
      watch: {
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100,
        },
      },
    },
    plugins,
  };
});
