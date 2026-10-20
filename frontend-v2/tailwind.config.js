/** @type {import('tailwindcss').Config} */
// OnCulture Design System tokens (Inter, #5C00DD purple, clean SaaS layout)
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // OnCulture Brand Core
        onculture: {
          purple: '#5C00DD',
          'purple-hover': '#4A00B4',
          'purple-light': '#F3EBFD',
          'purple-badge': '#EAE4FC',
          'gray-bg': '#F9FAFB',
          'metric-bg': '#F5F7FD',
          border: '#E5E7EB',
          'border-light': '#F3F4F6',
          green: '#16A34A',
          'green-hover': '#15803D',
        },

        // Primary mappings aligned to OnCulture Purple
        'primary': '#5C00DD',
        'primary-container': '#5C00DD',
        'primary-hover': '#4A00B4',
        'on-primary': '#ffffff',
        'on-primary-container': '#F3EBFD',
        'primary-fixed': '#F3EBFD',
        'primary-fixed-dim': '#EAE4FC',
        'on-primary-fixed': '#3B008D',

        // Secondary & Accent mappings
        'secondary': '#6B7280',
        'secondary-container': '#F3F4F6',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#1F2937',

        // Surfaces & Backgrounds
        'surface': '#F9FAFB',
        'surface-dim': '#F3F4F6',
        'surface-bright': '#FFFFFF',
        'surface-container-lowest': '#FFFFFF',
        'surface-container-low': '#F9FAFB',
        'surface-container': '#F3F4F6',
        'surface-container-high': '#E5E7EB',
        'surface-container-highest': '#D1D5DB',

        // Typography & Lines
        'on-surface': '#111827',
        'on-surface-variant': '#4B5563',
        'outline': '#9CA3AF',
        'outline-variant': '#E5E7EB',

        // Semantics
        'error': '#DC2626',
        'error-container': '#FEE2E2',
        'on-error': '#ffffff',
        'on-error-container': '#991B1B',

        'success': '#16A34A',
        'success-container': '#DCFCE7',
        'warning': '#D97706',
        'warning-container': '#FEF3C7',
      },
      borderRadius: {
        'sm': '0.25rem',
        DEFAULT: '0.375rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        'gutter': '1.5rem',
        'gutter-mobile': '1rem',
        'margin': '2rem',
        'margin-mobile': '1rem',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
        'headline-lg': ['Inter', 'sans-serif'],
        'headline-md': ['Inter', 'sans-serif'],
        'headline-sm': ['Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'body-sm': ['Inter', 'sans-serif'],
        'label-lg': ['Inter', 'sans-serif'],
        'label-md': ['Inter', 'sans-serif'],
        'label-sm': ['Inter', 'sans-serif'],
      },
      fontSize: {
        'display': ['2.5rem', { lineHeight: '3rem', letterSpacing: '-0.025em', fontWeight: '800' }],
        'headline-lg': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em', fontWeight: '700' }],
        'headline-sm': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.005em', fontWeight: '400' }],
        'body-md': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0em', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0em', fontWeight: '400' }],
        'label-lg': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em', fontWeight: '600' }],
        'label-md': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '600' }],
        'label-sm': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.03em', fontWeight: '600' }],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.03)',
        'shell': '0 1px 3px rgba(0,0,0,0.05)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      }
    }
  },
  plugins: []
}
