/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        railway: {
          navy: '#1F3864',       // Primary Header & Structural Accent
          blue: '#0070C0',       // Primary Brand / Engineering Dept
          amber: '#ED7D31',      // Operational Conflict / TRD Isolation / Warning
          green: '#548235',      // Bundling Synergy / Approved / Success
          crimson: '#C00000',    // Rejection / Overdue Danger
          bg: '#F4F6F9',         // Professional Console Canvas Background
          card: '#FFFFFF',       // Clean Panel Surfaces
          border: '#D9E1E8',     // Subtle Structural Borders
          track: '#EAEFF5',      // Gantt Track Slot Surface
          window: '#D9E8F5',     // Maintenance Window Surface
        }
      }
    },
  },
  plugins: [],
}
