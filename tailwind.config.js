// tailwind.config.js
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          'primary': '#4299e1',
          'primary-dark': '#3182ce',
          'secondary': '#805ad5',
          'secondary-dark': '#6b46c1',
          'success': '#48bb78',
          'success-dark': '#38a169',
          'warning': '#ed8936',
          'warning-dark': '#dd6b20',
          'danger': '#e53e3e',
          'danger-dark': '#c53030',
        }
      }
    }
  };
} else {
  console.error('Tailwind object not found. Ensure browser@4_css.js is loaded before tailwind.config.js');
}
