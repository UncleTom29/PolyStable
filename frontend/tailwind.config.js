/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
        sans:    ["var(--font-dm-sans)", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
      },
      colors: {
        base: {
          DEFAULT: "#07090f",
          1:       "#0c1018",
          2:       "#111622",
          3:       "#181e2b",
        },
        border:  "rgba(255,255,255,0.07)",
        border2: "rgba(255,255,255,0.12)",
        surface: "rgba(255,255,255,0.028)",
        surface2:"rgba(255,255,255,0.055)",
        ink:     "#e8e4dc",
        muted:   "#6b7280",
        dim:     "#3a3f4d",
        brand: {
          DEFAULT: "#e6007a",
          dim:     "rgba(230,0,122,0.14)",
          glow:    "rgba(230,0,122,0.28)",
        },
        teal: {
          DEFAULT: "#00c4a7",
          dim:     "rgba(0,196,167,0.14)",
        },
        amber: {
          DEFAULT: "#f0b429",
          dim:     "rgba(240,180,41,0.14)",
        },
        emerald: {
          DEFAULT: "#22c47e",
          dim:     "rgba(34,196,126,0.14)",
        },
        rose: {
          DEFAULT: "#f74b5a",
          dim:     "rgba(247,75,90,0.14)",
        },
      },
      borderRadius: {
        card:  "14px",
        card2: "20px",
        pill:  "9999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
        glow:  "0 0 24px rgba(230,0,122,0.22)",
        "glow-teal": "0 0 24px rgba(0,196,167,0.18)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
      },
      animation: {
        "fade-up":  "fade-up 0.4s ease both",
        "fade-in":  "fade-in 0.3s ease both",
        shimmer:    "shimmer 1.6s linear infinite",
        "pulse2":   "pulse2 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};