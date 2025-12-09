import OneSignal from "react-onesignal";

let initialized = false;
let initPromise: Promise<void> | null = null;

export const initOneSignal = async () => {
  if (initialized || typeof window === "undefined") return;

  // Prevent multiple simultaneous init calls
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: "OneSignalSDKWorker.js",
      });
      initialized = true;
      console.log("[OneSignal] SDK initialized");
    } catch (error) {
      console.error("[OneSignal] Init failed:", error);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
};

// Check if SDK is ready
export const isOneSignalReady = () => initialized;

// Track current logged-in external ID to prevent duplicate calls
let currentExternalId: string | null = null;

// Call when user connects wallet (after Privy auth)
// This links the device to the wallet address
export const loginOneSignal = async (walletAddress: string): Promise<boolean> => {
  const externalId = walletAddress.toLowerCase();

  // Skip if already logged in with this ID
  if (currentExternalId === externalId) {
    console.log("[OneSignal] Already logged in with external_id:", externalId);
    return true;
  }

  try {
    // Wait for SDK to be ready (with timeout)
    if (!initialized) {
      console.log("[OneSignal] Waiting for SDK before login...");
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OneSignal init timeout for login")), 10000),
      );
      await Promise.race([initPromise || initOneSignal(), timeout]);
    }

    if (!initialized) {
      console.error("[OneSignal] SDK not initialized, cannot login");
      return false;
    }

    console.log("[OneSignal] Logging in with external_id:", externalId);
    await OneSignal.login(externalId);
    currentExternalId = externalId;
    console.log("[OneSignal] Login successful");
    return true;
  } catch (error) {
    console.error("[OneSignal] Login failed:", error);
    return false;
  }
};

// Call when user disconnects wallet
export const logoutOneSignal = async () => {
  try {
    await OneSignal.logout();
    currentExternalId = null;
    console.log("[OneSignal] Logged out");
  } catch (error) {
    console.error("[OneSignal] Logout failed:", error);
  }
};

// Request push permission AND opt-in to create subscription (call from UI button)
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    // Wait for SDK to be ready (with timeout)
    if (!initialized) {
      console.log("[OneSignal] Waiting for SDK to initialize...");
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("OneSignal init timeout")), 10000),
      );
      await Promise.race([initPromise || initOneSignal(), timeout]);
    }

    if (!initialized) {
      console.error("[OneSignal] SDK not initialized");
      return false;
    }

    // Request browser permission - this shows the native browser prompt
    console.log("[OneSignal] Requesting permission...");
    const permission = await OneSignal.Notifications.requestPermission();
    console.log("[OneSignal] Permission result:", permission);

    if (!permission) return false;

    // Opt-in to create the push subscription
    await OneSignal.User.PushSubscription.optIn();
    console.log("[OneSignal] Opted in, subscription ID:", OneSignal.User.PushSubscription.id);
    return true;
  } catch (error) {
    console.error("[OneSignal] Failed to request permission:", error);
    return false;
  }
};

// Check current permission state
export const getNotificationPermission = (): boolean => {
  return OneSignal.Notifications.permission;
};

// Check if user has an active OneSignal push subscription
export const isPushSubscribed = (): boolean => {
  if (!initialized) return false;
  try {
    const subscription = OneSignal.User.PushSubscription;
    const isSubscribed = !!(subscription.id && subscription.optedIn);
    console.log("[OneSignal] Subscription check:", {
      id: subscription.id,
      optedIn: subscription.optedIn,
      token: subscription.token ? "exists" : "none",
      isSubscribed,
    });
    return isSubscribed;
  } catch (error) {
    console.error("[OneSignal] Subscription check error:", error);
    return false;
  }
};

// Event Listeners - call these after SDK is initialized

// Listen for notification clicks
export const onNotificationClick = (callback: (url?: string) => void) => {
  if (!initialized) {
    console.warn("[OneSignal] SDK not initialized, cannot add click listener");
    return;
  }
  OneSignal.Notifications.addEventListener("click", event => {
    const url = event.result?.url;
    callback(url);
  });
};

// Listen for foreground notifications (to customize display)
export const onNotificationForeground = (callback: (event: { preventDefault: () => void }) => void) => {
  if (!initialized) {
    console.warn("[OneSignal] SDK not initialized, cannot add foreground listener");
    return;
  }
  OneSignal.Notifications.addEventListener("foregroundWillDisplay", callback);
};

// Listen for permission changes
export const onPermissionChange = (callback: (permission: boolean) => void) => {
  if (!initialized) {
    console.warn("[OneSignal] SDK not initialized, cannot add permission listener");
    return;
  }
  OneSignal.Notifications.addEventListener("permissionChange", callback);
};

// Listen for subscription changes
export const onSubscriptionChange = (
  callback: (current: { id: string | null; token: string | null; optedIn: boolean }) => void,
) => {
  if (!initialized) {
    console.warn("[OneSignal] SDK not initialized, cannot add subscription listener");
    return;
  }
  OneSignal.User.PushSubscription.addEventListener("change", event => {
    callback({
      id: event.current.id ?? null,
      token: event.current.token ?? null,
      optedIn: event.current.optedIn,
    });
  });
};

// Add a tag to the user for segmentation
export const addTag = (key: string, value: string) => {
  if (!initialized) {
    console.warn("[OneSignal] SDK not initialized, cannot add tag");
    return;
  }
  try {
    OneSignal.User.addTag(key, value);
    console.log(`[OneSignal] Tag added: ${key}=${value}`);
  } catch (error) {
    console.error("[OneSignal] Failed to add tag:", error);
  }
};

// Add multiple tags
export const addTags = (tags: Record<string, string>) => {
  if (!initialized) {
    console.warn("[OneSignal] SDK not initialized, cannot add tags");
    return;
  }
  try {
    OneSignal.User.addTags(tags);
    console.log("[OneSignal] Tags added:", tags);
  } catch (error) {
    console.error("[OneSignal] Failed to add tags:", error);
  }
};
