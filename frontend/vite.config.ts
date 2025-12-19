import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // 生产环境构建配置
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: false, // 暂时禁用压缩，便于调试
    // 确保构建时使用正确的 API 地址
    rollupOptions: {
      treeshake: false, // 禁用tree-shaking，确保所有代码都被包含
      output: {
        // 完全禁用代码分割，所有代码都在在一个文件中
        manualChunks: undefined,
        // preserveComments 不是有效的 Rollup 选项，已移除
        // 注释会通过 minify: false 保留
      },
    },
    esbuild: {
      // 禁用esbuild的优化
      minifyIdentifiers: false,
      minifySyntax: false,
      minifyWhitespace: false,
    },
  },
})

