import { defineConfig } from 'vite';

export default defineConfig({
  base: '/MermZen/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'esnext',
    cssMinify: true,
    rollupOptions: {
      input: { main: 'index.html', embed: 'embed.html' },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/mermaid') || id.includes('node_modules/khroma') || id.includes('node_modules/dagre') || id.includes('node_modules/elkjs'))
            return 'mermaid';
          if (id.includes('@codemirror') || id.includes('@lezer') || id.includes('codemirror-lang-mermaid'))
            return 'codemirror';
          if (id.includes('node_modules/codemirror/'))
            return 'codemirror';
          if (id.includes('node_modules/svgo'))
            return 'svgo';
          if (id.includes('node_modules/pako'))
            return 'vendor';
          if (id.includes('node_modules'))
            return 'vendor';
        },
      },
    },
  },
  optimizeDeps: {
    include: ['mermaid', 'pako'],
  },
});
