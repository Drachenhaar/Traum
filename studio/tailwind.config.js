/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Gealtertes Papier – der Buchblock
        paper: {
          50: '#F6F0E1',
          100: '#EFE7D4',
          200: '#E6DCC4',
          300: '#D9CCAE',
          400: '#C4B48F',
        },
        // Blattgold – Kapitelzeichen, Linien, Lesezeichen
        gild: {
          300: '#E3C878',
          400: '#D4AF37',
          500: '#B8860B',
          600: '#8C6510',
        },
        // Der dunkle Tisch, auf dem das Buch liegt
        desk: {
          900: '#0E0C0A',
          800: '#151210',
          700: '#1E1916',
          600: '#2A231D',
          500: '#3A302733',
        },
        // Warmes Creme – die Arbeitsfläche
        cream: {
          50: '#FCFAF5',
          100: '#F7F2E8',
          200: '#F1EADC',
          300: '#E8DECB',
        },
        // Sehr dunkles Olivgrün – Navigation
        olive: {
          900: '#191D15',
          800: '#20261B',
          700: '#2A3123',
          600: '#3A422F',
          500: '#525B44',
          400: '#7A8467',
        },
        // Gedecktes Messing – Akzent
        brass: {
          300: '#D3BC8C',
          400: '#C0A468',
          500: '#A8853F',
          600: '#8C6D31',
        },
        // Dunkles warmes Braun – Text
        ink: {
          DEFAULT: '#3B2E23',
          muted: '#7C6A57',
          faint: '#A4907A',
        },
        line: '#E5DCCA',
        lineStrong: '#D8CCB4',
      },
      fontFamily: {
        serif: ['"Iowan Old Style"', 'Georgia', '"Times New Roman"', 'ui-serif', 'serif'],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(59, 46, 35, 0.05), 0 6px 18px -12px rgba(59, 46, 35, 0.25)',
        lift: '0 2px 6px rgba(59, 46, 35, 0.07), 0 16px 36px -18px rgba(59, 46, 35, 0.35)',
        panel: '0 24px 60px -24px rgba(25, 29, 21, 0.45)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      transitionTimingFunction: {
        calm: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        /* Eine schwere Seite fällt nach vorn – kein Blätterrauschen, kein Curl. */
        turnForward: {
          '0%': { opacity: '0', transform: 'perspective(2400px) rotateY(-9deg) translateX(3%)' },
          '100%': { opacity: '1', transform: 'perspective(2400px) rotateY(0deg) translateX(0)' },
        },
        turnBack: {
          '0%': { opacity: '0', transform: 'perspective(2400px) rotateY(9deg) translateX(-3%)' },
          '100%': { opacity: '1', transform: 'perspective(2400px) rotateY(0deg) translateX(0)' },
        },
        /* Der Einband öffnet sich, das Buch tritt näher. */
        bookOpen: {
          '0%': { opacity: '0', transform: 'scale(0.94) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 200ms cubic-bezier(0.22,0.61,0.36,1) both',
        riseIn: 'riseIn 260ms cubic-bezier(0.22,0.61,0.36,1) both',
        slideUp: 'slideUp 260ms cubic-bezier(0.22,0.61,0.36,1) both',
        turnForward: 'turnForward 520ms cubic-bezier(0.33,0,0.2,1) both',
        turnBack: 'turnBack 520ms cubic-bezier(0.33,0,0.2,1) both',
        bookOpen: 'bookOpen 700ms cubic-bezier(0.22,0.61,0.36,1) both',
      },
    },
  },
  plugins: [],
};
