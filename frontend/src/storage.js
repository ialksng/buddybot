// Dedicated namespaced storage for BuddyBot to prevent collisions with parent site (ialksng.me)
export const STORAGE_KEYS = {
  TOKEN: "buddybot_token",
  USER: "buddybot_user",
  GUEST_MSG_COUNT: "buddybot_guest_msg_count",
  GUEST_THREAD_ID: "buddybot_guest_thread_id",
  CACHED_THREADS: "buddybot_cached_threads",
  ACTIVE_THREAD_ID: "buddybot_active_thread_id",
  ACTIVE_THREAD_CHATS: "buddybot_active_thread_chats",
  SELECTED_MODEL: "buddybot_selected_model",
};

export const getStoredToken = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN) || localStorage.getItem("token") || null;
  } catch {
    return null;
  }
};

export const setStoredToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem("token");
    }
  } catch (e) {
    console.warn("Storage error:", e);
  }
};

export const getStoredUser = () => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER) || localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem("user");
    }
  } catch (e) {
    console.warn("Storage error:", e);
  }
};

export const getCachedThreads = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_THREADS) || localStorage.getItem("cached_threads");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setCachedThreads = (threads) => {
  try {
    if (Array.isArray(threads)) {
      localStorage.setItem(STORAGE_KEYS.CACHED_THREADS, JSON.stringify(threads));
    }
  } catch (e) {
    console.warn("Storage error:", e);
  }
};

export const getActiveThreadId = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_THREAD_ID) || localStorage.getItem("active_thread_id") || null;
  } catch {
    return null;
  }
};

export const setActiveThreadId = (threadId) => {
  try {
    if (threadId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_THREAD_ID, threadId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_THREAD_ID);
    }
  } catch (e) {
    console.warn("Storage error:", e);
  }
};

export const getActiveChats = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_THREAD_CHATS) || localStorage.getItem("active_thread_chats");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const setActiveChats = (chats) => {
  try {
    if (Array.isArray(chats) && chats.length > 0) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_THREAD_CHATS, JSON.stringify(chats));
    }
  } catch (e) {
    console.warn("Storage error:", e);
  }
};

export const clearActiveChats = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_THREAD_CHATS);
    localStorage.removeItem("active_thread_chats");
  } catch (e) {
    console.warn("Storage error:", e);
  }
};

export const clearAllBuddyBotStorage = () => {
  try {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("cached_threads");
    localStorage.removeItem("active_thread_id");
    localStorage.removeItem("active_thread_chats");
    localStorage.removeItem("guest_msg_count");
    localStorage.removeItem("guest_thread_id");
  } catch (e) {
    console.warn("Storage error:", e);
  }
};

