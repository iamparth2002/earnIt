import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Clean Purple & White Theme
        background: "#faf8ff",
        "background-light": "#f3f0fa",
        surface: "#ffffff",
        "surface-light": "#f8f5ff",
        "surface-secondary": "#f0ebf8",
        border: "#e5dff0",
        "border-light": "#d4cbeb",
        foreground: "#1a1425",
        muted: "#9085a0",

        // Primary - Vibrant Purple
        primary: {
          DEFAULT: "#7c3aed",
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },

        // Accent - Fresh Green
        accent: {
          DEFAULT: "#10b981",
          light: "#d1fae5",
          dark: "#059669",
        },

        // Warning - Warm Orange/Gold
        warning: {
          DEFAULT: "#f59e0b",
          light: "#fef3c7",
          dark: "#d97706",
        },

        // Danger - Soft Red
        danger: {
          DEFAULT: "#ef4444",
          light: "#fee2e2",
          dark: "#dc2626",
        },

        // Info Blue
        info: {
          DEFAULT: "#3b82f6",
          light: "#dbeafe",
          dark: "#2563eb",
        },

        // Text colors for light theme
        text: {
          primary: "#1a1425",
          secondary: "#6b5b7a",
          muted: "#9085a0",
        },

        // Gold for coins
        gold: {
          DEFAULT: "#f59e0b",
          light: "#fcd34d",
          dark: "#b45309",
        },

        // Category Colors
        physical: "#ef4444",
        mental: "#3b82f6",
        spiritual: "#8b5cf6",
        social: "#f59e0b",
        creative: "#ec4899",
        health: "#10b981",
      },
      fontFamily: {
        poppins: ["var(--font-poppins)", "system-ui", "sans-serif"],
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        display: ["var(--font-poppins)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(124, 58, 237, 0.08)",
        medium: "0 4px 12px rgba(124, 58, 237, 0.12)",
        large: "0 8px 24px rgba(124, 58, 237, 0.16)",
        glow: "0 0 20px rgba(124, 58, 237, 0.25)",
        "glow-lg": "0 0 40px rgba(124, 58, 237, 0.35)",
        card: "0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(124, 58, 237, 0.08)",
        "card-hover": "0 4px 20px rgba(124, 58, 237, 0.15)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "purple-gradient": "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
        "gold-gradient": "linear-gradient(135deg, #f59e0b 0%, #fcd34d 100%)",
        "green-gradient": "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
        "blue-gradient": "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
        "pink-gradient": "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
        "mesh-gradient": "radial-gradient(at 40% 20%, rgba(124, 58, 237, 0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(139, 92, 246, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(236, 72, 153, 0.05) 0px, transparent 50%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-up": "fadeUp 0.5s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
        "bounce-soft": "bounceSoft 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "spin-slow": "spin 3s linear infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        wiggle: "wiggle 1s ease-in-out infinite",
        "coin-flip": "coinFlip 0.6s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        coinFlip: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(360deg)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
