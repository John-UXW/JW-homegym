// 홈짐 루틴 Service Worker
// 백그라운드 알림을 위해 필요 (모바일 크롬은 new Notification()을 지원하지 않고
// ServiceWorkerRegistration.showNotification()만 지원함)
//
// 타이머 예약 방식: 메인 페이지가 백그라운드에서 멈춰도, SW가 스스로
// setTimeout으로 "N초 후 알림 1번"을 예약해서 최소한 종료 시점 알림은 보장한다.
// (SW도 OS 절전 정책의 영향을 받을 수 있으나, 메인 페이지보다 훨씬 오래 살아남는다.)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 현재 예약된 타이머의 handle과 만료 시각을 저장 (SW 재시작 시 초기화될 수 있음)
let _pendingTimer = null;

function showRestNotification(title, body, vibrate) {
  const options = {
    body: body || '',
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgcng9IjI0IiBmaWxsPSIjMDgwODEwIi8+PHRleHQgeD0iNjQiIHk9Ijg1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjcyIj7wn4+3PC90ZXh0Pjwvc3ZnPg==',
    vibrate: vibrate || [200, 100, 200],
    tag: 'gym-rest-alert',
    renotify: true,
    requireInteraction: false,
  };
  return self.registration.showNotification(title, options);
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  // 매초 갱신용 알림바 (기존 방식 유지 — 포그라운드/근접 상태에서 잘 작동)
  if (data.type === 'SHOW_NOTIFICATION') {
    const options = {
      body: data.body || '',
      icon: data.icon,
      badge: data.icon,
      silent: !!data.silent,
      vibrate: (data.vibrate && data.vibrate.length) ? data.vibrate : undefined,
      tag: data.tag || 'gym-rest-timer',
      renotify: data.renotify !== undefined ? data.renotify : false,
      requireInteraction: false,
    };
    event.waitUntil(self.registration.showNotification(data.title || '홈짐 루틴', options));
    return;
  }

  // 휴식 타이머 예약: N초 뒤 SW가 스스로 알림을 띄움 (메인 페이지가 멈춰도 독립 실행)
  if (data.type === 'SCHEDULE_REST_END') {
    if (_pendingTimer) { clearTimeout(_pendingTimer); _pendingTimer = null; }
    const ms = Math.max(0, data.ms || 0);
    const title = data.title || '✅ 휴식 끝!';
    const body = data.body || '다음 세트를 시작하세요';
    _pendingTimer = setTimeout(() => {
      showRestNotification(title, body, [200, 100, 200]);
      _pendingTimer = null;
    }, ms);
    return;
  }

  // 예약 취소 (건너뛰기 버튼 등으로 타이머를 조기 종료했을 때)
  if (data.type === 'CANCEL_REST_END') {
    if (_pendingTimer) { clearTimeout(_pendingTimer); _pendingTimer = null; }
    return;
  }
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
