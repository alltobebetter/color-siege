import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "p1": "#e8475a",
        "p2": "#4a6cf7",
        "bg": "#0e0e12",
        "surface": "#18181f",
        "surface2": "#20202a",
        "border-default": "#2a2a36",
        "text-main": "#d4d4dc",
        "text-dim": "#6b6b78",
      },
    },
  },
  plugins: [],
};

export default config;
