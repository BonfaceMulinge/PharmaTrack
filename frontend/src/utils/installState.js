let deferredPrompt = null;
let listeners = [];

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function setDeferredPrompt(prompt) {
  deferredPrompt = prompt;
  listeners.forEach((fn) => fn(prompt));
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
  listeners.forEach((fn) => fn(null));
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((f) => f !== fn);
  };
}
