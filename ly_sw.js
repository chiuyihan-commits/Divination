const CACHE_NAME = 'Krane-Divination-v2'; // 更改版號以強制更新

// 1. 這裡「只能」放本地端的檔案，絕對不能放外部 HTTPS 網址！
const urlsToCache = [
  './', // ★ 極重要：必須快取根目錄，否則直接輸入網址會進不去
  './index.html',
  './ly_data.js',
  './ly_draw.js',
  './ly_engine.js',
  './ly_ui.js',
  './ly_storage.js',
  './ly_firebase-config.js',
  './taiwan_map.js',
  './ly_manifest.json',
  './ly_style.css',
  './tools/localforage.min.js',
  './tools/lunar.js'
];

// 安裝階段：把本地檔案下載並存入手機快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 基礎快取已成功開啟');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // 強制立即接管控制權
});

self.addEventListener('fetch', event => {
    // 1. 只攔截 HTTP / HTTPS 請求
    if (!event.request.url.startsWith('http')) return;

    // ★ 2. 嚴格防呆：只允許 GET 請求存入快取 (放行 POST 等資料庫寫入操作)
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);

    // ===================================================
    // ★ 策略 A：針對 Firebase CDN (外部資源) 採用「快取優先」
    // ===================================================
    if (requestUrl.hostname === 'www.gstatic.com') {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                    }
                    return networkResponse;
                });
            })
        );
        return;
    }

    // ===================================================
    // ★ 終極防護：排除所有外部 API 網址 (如 Webhook 或 Firebase API 連線)
    // 只有跟你網域「完全相同」的本地檔案，才允許進入下方的快取邏輯！
    // ===================================================
    if (requestUrl.origin !== self.location.origin) {
        return; // 直接放行去網路抓，絕對不快取！
    }

    // ===================================================
    // ★ 策略 B：針對本地檔案採用「背景更新 (Stale-While-Revalidate)」
    // ===================================================
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            }).catch(err => {
                console.log('📴 背景連線失敗，目前處於離線模式:', err);
                // ★ 修正 1：必須把錯誤拋出，讓瀏覽器原生接手處理離線狀態
                throw err;
            });

            // ★ 修正 2：使用 event.waitUntil 保命符！
            // 告訴瀏覽器：「雖然我先把 cachedResponse 還給你了，但我背景還有 Promise 在跑，請等它跑完再讓 Service Worker 休眠！」
            event.waitUntil(fetchPromise.catch(() => {})); 

            return cachedResponse || fetchPromise;
        })
    );
});

// 更新階段：刪除舊版快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ 刪除舊版快取', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});