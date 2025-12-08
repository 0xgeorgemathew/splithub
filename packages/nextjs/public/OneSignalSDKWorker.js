importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Custom notification click handler for reliable redirect
// This ensures notification clicks work even when app is closed or in background
self.addEventListener("notificationclick", event => {
  event.notification.close();

  // OneSignal structures data differently - check multiple locations
  const data = event.notification.data;
  let targetUrl = null;

  // Try different data structures that OneSignal might use
  if (data?.url) {
    targetUrl = data.url;
  } else if (data?.additionalData?.url) {
    targetUrl = data.additionalData.url;
  } else if (data?.launchURL) {
    targetUrl = data.launchURL;
  }

  // Fallback: construct URL from requestId if available
  if (!targetUrl && data?.additionalData?.requestId) {
    targetUrl = self.location.origin + "/settle/" + data.additionalData.requestId;
  }

  // Fallback for expense notifications: go to splits page
  if (!targetUrl && data?.additionalData?.type === "expense_created") {
    targetUrl = self.location.origin + "/splits";
  }

  if (targetUrl) {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
        // Try to focus existing window with same URL
        for (const client of windowClients) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        // Open new window
        return clients.openWindow(targetUrl);
      }),
    );
  }
});
