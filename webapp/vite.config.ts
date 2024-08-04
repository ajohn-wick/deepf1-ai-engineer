import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        global: {},
    },
    server: {
        port: 3000,
    },
    resolve: {
        alias: {
            '@components': path.resolve(__dirname, 'src/components'),
        }
    }
})
