import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./client/src/**/*.{ts,tsx}",
    "./client/index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Cairo", "sans-serif"],
        heading: ["Changa", "sans-serif"],
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px var(--color-primary)' },
          '50%': { opacity: '0.5', boxShadow: '0 0 10px var(--color-primary)' },
        },
        'luxury-fade': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slow-zoom': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.05)' },
        },
      },
      animation: {
        wave: 'wave 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'luxury-fade': 'luxury-fade 0.8s ease-out forwards',
        'slow-zoom': 'slow-zoom 20s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
