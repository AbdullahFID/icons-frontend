/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        queens: { blue: "#002452", red: "#B90E31", gold: "#FABD0F" },
        engsoc: { purple: "#660099", gold: "#fccc08" },
        brand: {
          50: "#eef2ff", 100: "#d8e0ff", 200: "#b3c2f7", 300: "#8199ec",
          400: "#5474db", 500: "#3457c9", 600: "#1e3a8a", 700: "#002452",
          800: "#001b3d", 900: "#001229",
        },
        border: "hsl(var(--border))", input: "hsl(var(--input))",
        ring: "hsl(var(--ring))", background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: {
        lg: "var(--radius)", md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)", xl: "1rem", "2xl": "1.25rem", "3xl": "1.5rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { transform: "translateY(100%)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out",
        "slide-up": "slide-up 0.35s cubic-bezier(0.4,0,0.2,1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
