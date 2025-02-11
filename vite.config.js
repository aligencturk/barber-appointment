import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    server: {
        port: 5174,
        host: true,
        cors: true,
        headers: {
            'Access-Control-Allow-Origin': '*'
        }
    },
    preview: {
        port: 5174,
        host: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets'
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src')
        }
    },
    publicDir: 'public'
});