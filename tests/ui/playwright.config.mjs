import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'.',testMatch:'*.spec.mjs',workers:1,timeout:20000,
 use:{browserName:'webkit',isMobile:true,hasTouch:true,deviceScaleFactor:3,viewport:{width:390,height:844},baseURL:'http://127.0.0.1:5174'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',url:'http://127.0.0.1:5174/tests/ui/index.html',reuseExistingServer:!process.env.CI,timeout:30000},
 reporter:'list'
});
