import {defineConfig} from '@playwright/test'

export default defineConfig({
  testDir:'./test',
  testMatch:'public-flow.spec.mjs',
  fullyParallel:true,
  workers:2,
  timeout:30000,
  outputDir:'target/public-flow',
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:5176',browserName:'chromium',trace:'retain-on-failure'},
  webServer:{
    command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5176 --strictPort',
    url:'http://127.0.0.1:5176',reuseExistingServer:false,
    env:{VITE_API_BASE_URL:'http://127.0.0.1:5188',VITE_NETWORK_WS_URL:'ws://127.0.0.1:5188/ws'},
  },
})
