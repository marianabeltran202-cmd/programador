const CACHE_NAME = 'taskflow-ai-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/constants.ts',
  '/utils.ts',
  '/services/geminiService.ts',
  '/components/Header.tsx',
  '/components/Calendar.tsx',
  '/components/DailyTasks.tsx',
  '/components/TaskItem.tsx',
  '/components/AdminDashboard.tsx',
  '/components/AddTaskModal.tsx',
  '/components/EditTaskModal.tsx',
  '/components/StatsModal.tsx',
  '/components/ConfirmationModal.tsx',
  '/components/CommentModal.tsx',
  '/components/SaveToast.tsx',
  '/components/LoginScreen.tsx',
  '/components/OverdueTasksNotification.tsx',
  '/components/CancellationReasonModal.tsx',
  '/components/PasswordModal.tsx',
  '/components/SetPasswordModal.tsx',
  '/components/SearchModal.tsx',
  '/components/RenameModal.tsx',
  '/components/Settings.tsx',
  '/components/MonthlyReport.tsx',
  '/components/BarChart.tsx',
  '/vite.svg',
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1/',
  'https://aistudiocdn.com/react@^19.1.1/',
  'https://aistudiocdn.com/@google/genai@^1.21.0',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Use addAll for atomic operation
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Failed to cache one or more resources:', error);
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache - fetch from network
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response to cache
            // We only cache GET requests that are not from chrome-extension protocol
            if (!response || response.status !== 200 || event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
            // Network request failed, maybe return a fallback page if you have one
            // For this app, it will just fail to load non-cached resources
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
