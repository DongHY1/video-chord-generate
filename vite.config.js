import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
export default defineConfig({
    plugins: [viteCompression()],
   server:{
       headers:{
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp"
       }
   }
})