// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// These values are intentionally committed — the anon key is a public client-side key
// designed to be exposed. Data is protected by Supabase Row Level Security (RLS) policies.
// Never commit the service role key.
const SUPABASE_URL = "https://atdxiccjxeoqeuxozaba.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0ZHhpY2NqeGVvcWV1eG96YWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MDQ3OTAsImV4cCI6MjA5NTE4MDc5MH0.X7jlUzCpOBllgjefxdNJvzlYdKkCAo_OW__EQ_dmLUc";

export default defineConfig({
  vite: {
    server: {
      port: process.env.PORT ? Number(process.env.PORT) : undefined,
    },
    // Explicitly define VITE_ env vars so they take precedence over any env injection
    // from the build environment (including Lovable's pipeline which may inject old values).
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(SUPABASE_ANON_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify("atdxiccjxeoqeuxozaba"),
    },
  },
});
