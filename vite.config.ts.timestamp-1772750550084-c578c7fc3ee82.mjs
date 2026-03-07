// vite.config.ts
import { defineConfig } from "file:///C:/Users/geekr/Desktop/code/JDR-app/JDR-App/node_modules/vite/dist/node/index.js";
import path from "node:path";
import electron from "file:///C:/Users/geekr/Desktop/code/JDR-app/JDR-App/node_modules/vite-plugin-electron/dist/simple.mjs";
import react from "file:///C:/Users/geekr/Desktop/code/JDR-app/JDR-App/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/geekr/Desktop/code/JDR-app/JDR-App/node_modules/@tailwindcss/vite/dist/index.mjs";
var __vite_injected_original_dirname = "C:\\Users\\geekr\\Desktop\\code\\JDR-app\\JDR-App";
var vite_config_default = defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    electron({
      main: {
        entry: "electron/main.ts"
      },
      preload: {
        input: path.join(__vite_injected_original_dirname, "electron/preload.ts")
      },
      renderer: process.env.NODE_ENV === "test" ? void 0 : {}
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxnZWVrclxcXFxEZXNrdG9wXFxcXGNvZGVcXFxcSkRSLWFwcFxcXFxKRFItQXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxnZWVrclxcXFxEZXNrdG9wXFxcXGNvZGVcXFxcSkRSLWFwcFxcXFxKRFItQXBwXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9nZWVrci9EZXNrdG9wL2NvZGUvSkRSLWFwcC9KRFItQXBwL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xyXG5pbXBvcnQgZWxlY3Ryb24gZnJvbSAndml0ZS1wbHVnaW4tZWxlY3Ryb24vc2ltcGxlJ1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXHJcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW1xyXG4gICAgdGFpbHdpbmRjc3MoKSxcclxuICAgIHJlYWN0KCksXHJcbiAgICBlbGVjdHJvbih7XHJcbiAgICAgIG1haW46IHtcclxuICAgICAgICBlbnRyeTogJ2VsZWN0cm9uL21haW4udHMnLFxyXG4gICAgICB9LFxyXG4gICAgICBwcmVsb2FkOiB7XHJcbiAgICAgICAgaW5wdXQ6IHBhdGguam9pbihfX2Rpcm5hbWUsICdlbGVjdHJvbi9wcmVsb2FkLnRzJyksXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlbmRlcmVyOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Rlc3QnXHJcbiAgICAgICAgPyB1bmRlZmluZWRcclxuICAgICAgICA6IHt9LFxyXG4gICAgfSksXHJcbiAgXSxcclxufSkiXSwKICAibWFwcGluZ3MiOiAiO0FBQWlVLFNBQVMsb0JBQW9CO0FBQzlWLE9BQU8sVUFBVTtBQUNqQixPQUFPLGNBQWM7QUFDckIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBSnhCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLFlBQVk7QUFBQSxJQUNaLE1BQU07QUFBQSxJQUNOLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxRQUNKLE9BQU87QUFBQSxNQUNUO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxPQUFPLEtBQUssS0FBSyxrQ0FBVyxxQkFBcUI7QUFBQSxNQUNuRDtBQUFBLE1BQ0EsVUFBVSxRQUFRLElBQUksYUFBYSxTQUMvQixTQUNBLENBQUM7QUFBQSxJQUNQLENBQUM7QUFBQSxFQUNIO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
