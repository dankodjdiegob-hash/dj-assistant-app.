import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Esto asegura que las variables de entorno funcionen si decidimos usarlas en el futuro
    'process.env': process.env
  }
});