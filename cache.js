const CACHE_NAME = "my-site-cache-v1";
const CACHE_EXPIRATION = 5 * 60 * 1000; // 5 phút (5 * 60 giây)

// URLs cần cache (giữ nguyên định dạng prefix + file lẻ)
const urlsToCache = [
    "/index.html",
    "/main.js",
    "/Utils.class.js",
    "/watch/",
    "/assets/",
    "/app/",
    "/models/"
];

// Helper: Kiểm tra URL có cần cache không
function shouldCache(url) {
    return urlsToCache.some((prefix) => url.startsWith(prefix));
}

// Helper: Lưu metadata cho cache
async function saveCacheMetadata(cache, request) {
    const metadata = { timestamp: Date.now() }; // Thời gian cache hiện tại
    const metadataRequest = `${request.url}-metadata`;
    const metadataResponse = new Response(JSON.stringify(metadata));
    await cache.put(metadataRequest, metadataResponse);
}

// Helper: Lấy metadata từ cache
async function getCacheMetadata(cache, request) {
    const metadataRequest = `${request.url}-metadata`;
    const metadataResponse = await cache.match(metadataRequest);
    if (!metadataResponse) return null;

    const metadataText = await metadataResponse.text();
    return JSON.parse(metadataText);
}

// Helper: Xóa cache nếu hết hạn
async function removeIfExpired(cache, request) {
    const metadata = await getCacheMetadata(cache, request);
    if (!metadata) return false;

    const isExpired = Date.now() - metadata.timestamp > CACHE_EXPIRATION;
    if (isExpired) {
        await cache.delete(request);
        await cache.delete(`${request.url}-metadata`); // Xóa metadata
        return true;
    }
    return false;
}

// Cài đặt cache khi service worker được cài đặt
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Opened cache");
            return Promise.all(
                urlsToCache.map((prefix) =>
                    fetch(prefix)
                        .then(async (response) => {
                            if (response.ok) {
                                await cache.put(new Request(prefix), response.clone());
                                await saveCacheMetadata(cache, new Request(prefix));
                            }
                        })
                        .catch((err) => console.error(`Failed to cache ${prefix}:`, err))
                )
            );
        })
    );
});

// Trong sự kiện 'fetch', kiểm tra tình trạng của response:
self.addEventListener("fetch", (event) => {
    const requestUrl = new URL(event.request.url);

    if (!shouldCache(requestUrl.pathname)) {
        return; // Bỏ qua request không cần cache
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cachedResponse = await cache.match(event.request);

            // Kiểm tra expiration nếu có cachedResponse
            if (cachedResponse) {
                const isExpired = await removeIfExpired(cache, event.request);
                if (!isExpired) {
                    console.log(`Cache hit: ${event.request.url}`);
                    return cachedResponse;
                }
            }

            // Fetch từ mạng nếu không có hoặc đã hết hạn
            const networkResponse = await fetch(event.request);
            if (!networkResponse.ok) return networkResponse;

            await cache.put(event.request, networkResponse.clone());
            await saveCacheMetadata(cache, event.request);
            return networkResponse;
        })
    );
});
