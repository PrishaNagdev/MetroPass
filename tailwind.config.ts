import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: "#F4713F", dark: "#E25F2D", tint: "#FDE3D8", surface: "#FCF8FF" } },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"], mono: ["var(--font-mono)", "ui-monospace", "monospace"] },
      keyframes: { scan: { "0%": { top: "8%" }, "100%": { top: "92%" } } },
      animation: { scan: "scan 2.2s ease-in-out infinite alternate" },
    },
  },
  plugins: [],
};
export default config;
