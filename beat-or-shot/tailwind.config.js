import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [path.join(dir, 'client/index.html'), path.join(dir, 'client/src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        ink: '#0B0B14',
        night: '#13131F',
        panel: '#1A1A2A',
        violet: { DEFAULT: '#8B5CF6', soft: '#A78BFA', deep: '#5B21B6' },
        cyan: { DEFAULT: '#00D9FF', soft: '#67E8F9' },
        win: '#19C86A',
        lose: '#FF4057',
        tie: '#FFC247'
      },
      fontFamily: {
        display: ['Unbounded', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(139,92,246,.65)',
        cyan: '0 0 32px -6px rgba(0,217,255,.6)'
      }
    }
  },
  plugins: []
};
