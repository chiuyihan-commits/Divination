const CACHE_NAME = 'Krane-Divination';

// 這裡列出所有我們需要「鎖進手機快取」讓離線也能讀取的檔案
const urlsToCache = [
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
  './tools/localforage.min.js', // ★ 極重要：資料庫套件
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js'
];

// 安裝階段：把所有檔案下載並存入手機快取
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('快取已成功開啟');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // 只攔截 HTTP / HTTPS 請求
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // ★ 嚴格防呆：確保回應是正常的才進行 clone
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(err => {
        console.log('背景連線失敗，目前處於離線模式:', err);
      });

      return cachedResponse || fetchPromise;
    })
  );
});

//更新階段：如果未來您的版本號更新了，清除舊的快取
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('刪除舊版快取', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});