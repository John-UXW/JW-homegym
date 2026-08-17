// 홈짐 루틴 Service Worker
// 백그라운드 알림을 위해 필요 (모바일 크롬은 new Notification()을 지원하지 않고
// ServiceWorkerRegistration.showNotification()만 지원함)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 메인 페이지에서 postMessage로 알림 요청을 받아서 표시
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'SHOW_NOTIFICATION') return;

  const title = data.title || '홈짐 루틴';
  const options = {
    body: data.body || '',
    icon: data.icon,
    badge: data.icon,
    silent: !!data.silent,                     // 매초 갱신 시 조용히 (진동/소리 없음)
    vibrate: (data.vibrate && data.vibrate.length) ? data.vibrate : undefined,
    tag: data.tag || 'gym-rest-timer',          // 같은 tag = 알림 1개로 계속 교체
    renotify: data.renotify !== undefined ? data.renotify : false,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 시 앱으로 포커스 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
