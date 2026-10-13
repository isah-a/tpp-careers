/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        violet: '#5B00EE', magenta: '#EB00E6', ink: '#0F172A', canvas: '#FAF8FF',
        muted: '#475569', line: '#E2E8F0', panel: '#F2F3FF'
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui'] },
      boxShadow: { card: '0 1px 3px rgba(15,23,42,.04),0 1px 2px rgba(15,23,42,.02)', float: '0 14px 40px rgba(91,0,238,.10)' }
    }
  },
  plugins: []
}
