// developer mode toggle
// when enabled, the app uses mock data instead of hitting the real backend
// uses a simple event system so toggling takes effect immediately

const DEV_MODE_KEY = "icons_dev_mode";
const DEV_MODE_EVENT = "icons_dev_mode_change";

export function isDevMode(): boolean {
  return true;
}

export function setDevMode(enabled: boolean) {
  try {
    localStorage.setItem(DEV_MODE_KEY, String(enabled));
  } catch {
    // localStorage not available
  }
  // fire event so all components can react immediately
  window.dispatchEvent(new CustomEvent(DEV_MODE_EVENT, { detail: enabled }));
}

// hook-friendly listener for dev mode changes
export function onDevModeChange(callback: (enabled: boolean) => void) {
  function handler(e: Event) {
    callback((e as CustomEvent).detail);
  }
  window.addEventListener(DEV_MODE_EVENT, handler);
  return () => window.removeEventListener(DEV_MODE_EVENT, handler);
}
