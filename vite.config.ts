import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: false,
    // Otimizações de chunk splitting para melhor cache
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separar vendor chunks mais granularmente
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // Outros node_modules em chunk separado
            return 'vendor';
          }
        },
        // Otimização de nomes de chunks para melhor cache
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Aumentar limite de aviso de chunk size
    chunkSizeWarningLimit: 1000,
    // Otimizações adicionais
    target: 'es2015',
    cssMinify: true,
    // Otimizar tamanho do bundle
    reportCompressedSize: false, // Desabilitar para builds mais rápidos
  },
  // Otimizações de preview
  preview: {
    port: 8080,
    strictPort: true,
  },
});

