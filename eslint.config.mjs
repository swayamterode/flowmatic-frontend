import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  /*
   * components/ui is vendored: shadcn's CLI generates these files and overwrites
   * them on the next `shadcn add`, so a fix here would not survive. Downgrading
   * rather than ignoring keeps the problem visible in `pnpm lint` while stopping
   * it from blocking commits that touch unrelated files.
   *
   * Currently applies to carousel.tsx alone, whose embla sync calls setState
   * from an effect body. Anything under components/ui that we genuinely take
   * ownership of should move out of this override.
   */
  {
    files: ["components/ui/**"],
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
