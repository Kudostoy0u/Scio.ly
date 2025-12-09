export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        regalblue: {
          100: "#021524",
        },
        regalred: {
          100: "#452942",
        },
      },
      fontFamily: {
        poppins: "var(--font-custom)",
      },
      animation: {
        "scio-loading": "scio-loading 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
