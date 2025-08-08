import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        regalblue: {
          100: "#021524"
        },
        regalred: {
          100: "#452942"
        }, 
        palenight: {
          100: "#282C3E"
        }
      },
      fontFamily: {
        'Poppins': 'var(--font-custom)'
      }
    },
  },
  plugins: [typography],
} satisfies Config;
