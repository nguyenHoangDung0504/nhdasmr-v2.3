// const CACHE_NAME = "nhdasmr-v2.3-cache-v1";
// const urlsToCache = [
//     "/index.html",
//     "/main.js",
//     "/Utils.class.js",
//     "/watch/index.html",
//     "/watch/main.js",
//     "/watch/altplayer/index.html",
//     "/watch/altplayer/main.js",
//     "/assets/alt_player_styles/main.css",
//     "/assets/alt_player_styles/responsive.css",
//     "/assets/home_styles/main.css",
//     "/assets/home_styles/responsive.css",
//     "/assets/watch_styles/main.css",
//     "/assets/watch_styles/responsive.css",
//     "/app/AltPlayer.class.js",
//     "/app/App.class.js",
//     "/app/Config.class.js",
//     "/app/Home.class.js",
//     "/app/Watch.class.js",
//     "/app/components/ZoomableContainer.component.js",
//     "/models/classes.js",
//     "/models/Database.class.js",
// ];

// const CACHE_EXPIRATION = 5 * 60 * 1000; // 5 phút
// const log = false;

// async function cacheWithTimestamp(cache, request, response) {
//     // Kiểm tra nếu URL nằm trong danh sách urlsToCache
//     if (!urlsToCache.includes(new URL(request.url).pathname)) {
//         log && console.log("Skipping caching for:", request.url);
//         return;
//     }

//     if (!response.ok) {
//         console.error(`Failed to fetch ${request.url}: ${response.status}`);
//         return;
//     }

//     const clonedResponse = response.clone();
//     await cache.put(request, clonedResponse);
// }

// // Cài đặt cache khi service worker được cài đặt
// self.addEventListener("install", (event) => {
//     event.waitUntil(
//         caches.open(CACHE_NAME).then((cache) => {
//             console.log("Opened cache");
//             return Promise.all(
//                 urlsToCache.map((url) =>
//                     fetch(url)
//                         .then((response) => cacheWithTimestamp(cache, new Request(url), response))
//                         .catch((err) => console.error(`Failed to cache ${url}:`, err))
//                 )
//             );
//         })
//     );
// });

// // Trong sự kiện 'fetch', kiểm tra tình trạng của response:
// self.addEventListener("fetch", (event) => {
//     const requestUrl = new URL(event.request.url);

//     // Chỉ xử lý nếu URL nằm trong danh sách urlsToCache
//     if (!urlsToCache.includes(requestUrl.pathname)) {
//         log && console.log("Skipping fetch and caching for:", request.url);
//         return;
//     }

//     event.respondWith(
//         caches.open(CACHE_NAME).then(async (cache) => {
//             const cachedResponse = await cache.match(event.request);
//             if (cachedResponse) {
//                 log && console.log(`Cache hit: ${event.request.url}`);
//                 return cachedResponse;
//             }

//             const networkResponse = await fetch(event.request);
//             if (!networkResponse.ok) {
//                 return networkResponse; // Trả về response mạng nếu có lỗi
//             }

//             await cacheWithTimestamp(cache, event.request, networkResponse);
//             return networkResponse;
//         })
//     );
// });

const CACHE_NAME = "my-site-cache-v1";
const urlsToCache = [
    "/index.html",
    "/watch/",
    "/assets/",
    "/app/",
    "/models/"
];

const log = false;

// Helper để kiểm tra URL có nằm trong danh sách cache hay không
function shouldCache(url) {
    return urlsToCache.some((prefix) => url.startsWith(prefix));
}

async function cacheWithTimestamp(cache, request, response) {
    if (!shouldCache(new URL(request.url).pathname)) {
        log && console.log("Skipping caching for:", request.url);
        return;
    }

    if (!response.ok) {
        console.error(`Failed to fetch ${request.url}: ${response.status}`);
        return;
    }

    const clonedResponse = response.clone();
    await cache.put(request, clonedResponse);
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Opened cache");
            return Promise.all(
                urlsToCache.map((prefix) =>
                    fetch(prefix)
                        .then((response) => cacheWithTimestamp(cache, new Request(prefix), response))
                        .catch((err) => console.error(`Failed to cache ${prefix}:`, err))
                )
            );
        })
    );
});

self.addEventListener("fetch", (event) => {
    const requestUrl = new URL(event.request.url);

    if (!shouldCache(requestUrl.pathname)) {
        log && console.log("Skipping fetch and caching for:", requestUrl.pathname);
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) {
                log && console.log(`Cache hit: ${event.request.url}`);
                return cachedResponse;
            }

            const networkResponse = await fetch(event.request);
            if (!networkResponse.ok) {
                return networkResponse; // Trả về response mạng nếu có lỗi
            }

            await cacheWithTimestamp(cache, event.request, networkResponse);
            return networkResponse;
        })
    );
});