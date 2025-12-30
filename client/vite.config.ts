import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@shared': path.resolve(__dirname, '../shared'),
            '@assets': path.resolve(__dirname, '../attached_assets'),
        },
    },
    server: {
        port: 5173,
        host: true,
        fs: {
            strict: true,
            allow: [
                // Allow access to project root and parent directories for shared modules
                path.resolve(__dirname, '..'),
            ],
        },
        cors: {
            origin: '*',
            credentials: true,
        },
    },
    build: {
        outDir: '../dist/public',
        emptyOutDir: true,
        sourcemap: true,
    },
    envDir: path.resolve(__dirname, '..'),
});
