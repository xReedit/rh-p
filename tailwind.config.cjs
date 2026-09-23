/** @type {import('tailwindcss').Config} */
module.exports = {
  // 'class' y no el default 'media': esta app es solo clara. Con el default,
  // los `dark:` del CSS se encendian segun el tema del sistema operativo y
  // pintaban los combos oscuros sobre una pantalla blanca.
  darkMode: 'class',
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {},    
  },
  plugins: [],
}
