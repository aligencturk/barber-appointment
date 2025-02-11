import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    server: {
        port: 3000,
        host: true,
        cors: true,
        headers: {
            'Access-Control-Allow-Origin': '*'
        }
    },
    build: {
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'pages/login.html'),
                dashboard: resolve(__dirname, 'pages/dashboard.html'),
                users: resolve(__dirname, 'pages/users.html'),
                appointments: resolve(__dirname, 'pages/appointments.html'),
                settings: resolve(__dirname, 'pages/settings.html')
            }
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './'),
            '@pages': resolve(__dirname, 'pages'),
            '@assets': resolve(__dirname, 'assets'),
            '@js': resolve(__dirname, 'js'),
            '@css': resolve(__dirname, 'css')
        }
    },
    appType: 'spa'
});