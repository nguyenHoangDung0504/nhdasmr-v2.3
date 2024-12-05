const CACHE_NAME = "my-site-cache-v1";
const urlsToCache = [
    "/index.html",
    "/main.js",
    "/Utils.class.js",
    "/watch/index.html",
    "/watch/main.js",
    "/altplayer/index.html",
    "/altplayer/main.js",
    "/assets/alt_player_styles/main.css",
    "/assets/alt_player_styles/responsive.css",
    "/assets/home_styles/main.css",
    "/assets/home_styles/responsive.css",
    "/assets/watch_styles/main.css",
    "/assets/watch_styles/responsive.css",
    "/app/AltPlayer.class.js",
    "/app/App.class.js",
    "/app/Config.class.js",
    "/app/Home.class.js",
    "/app/Watch.class.js",
    "/app/components/ZoomableContainer.component.js",
    "/models/classes.js",
    "/models/Database.class.js",
    "/data/s1.csv",

];
const CACHE_EXPIRATION = 5 * 60 * 1000; // 5 phút

// Cài đặt cache khi service worker được cài đặt
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Opened cache");
            // Lưu cache kèm với timestamp
            const timestampedRequests = urlsToCache.map(async (url) => {
                try {
                    const response = await fetch(url);
                    cache.put(
                        new Request(url, { cache: "reload" }),
                        new Response(response.body, {
                            headers: {
                                ...response.headers,
                                "X-Cached-Timestamp": Date.now(),
                            },
                        })
                    );
                } catch (err) {
                    return console.error(`Failed to cache ${url}:`, err);
                }
            });
            return Promise.all(timestampedRequests);
        })
    );
});

// Trả lại các tài nguyên từ cache khi có yêu cầu
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) =>
            cache.match(event.request).then(async (response) => {
                const now = Date.now();
                if (response) {
                    const cachedTimestamp = parseInt(response.headers.get("X-Cached-Timestamp") || "0");
                    const age = now - cachedTimestamp;

                    // Kiểm tra cache đã hết hạn chưa
                    if (age < CACHE_EXPIRATION) {
                        console.log(`Cache hit: ${event.request.url}, age: ${age}ms`);
                        return response;
                    } else {
                        console.log(`Cache expired: ${event.request.url}`);
                        cache.delete(event.request); // Xóa cache cũ
                    }
                }

                // Nếu không có cache hợp lệ, tải từ mạng và cập nhật cache
                const networkResponse = await fetch(event.request);
                cache.put(
                    event.request,
                    new Response(networkResponse.body, {
                        headers: {
                            ...networkResponse.headers,
                            "X-Cached-Timestamp": Date.now(),
                        },
                    })
                );
                return networkResponse;
            })
        )
    );
});

// Xóa cache cũ khi service worker mới được kích hoạt
// self.addEventListener("activate", (event) => {
//     const cacheWhitelist = [CACHE_NAME];
//     event.waitUntil(
//         caches.keys().then((cacheNames) =>
//             Promise.all(
//                 cacheNames.map((cacheName) => {
//                     if (!cacheWhitelist.includes(cacheName)) {
//                         return caches.delete(cacheName);
//                     }
//                 })
//             )
//         )
//     );
// });