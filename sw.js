const CACHE_NAME = 'adriaska-shell-v1';
const STATIC_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC_ASSETS))
      .catch(() => {}) // لو حصل خطأ في أي ملف ميمنعش التثبيت
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // أي حاجة بتروح لـ Supabase (بيانات حية) تتسيب تمامًا، من غير أي تدخل أو كاش
  if (url.hostname.includes('supabase.co')) return;
  if (e.request.method !== 'GET') return;

  // صفحة التطبيق نفسها (index.html): الأولوية للنت دايمًا عشان أي تحديث يبان فورًا.
  // لو مفيش نت، يرجع آخر نسخة محفوظة بدل ما الصفحة تفضل فاضية.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, resClone));
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(r => r || caches.match('./index.html'))
        )
    );
    return;
  }

  // ملفات ثابتة تانية (خطوط، chart.js، أيقونات): كاش الأول، ولو مش موجودة يجيبها من النت ويحفظها
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, resClone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
