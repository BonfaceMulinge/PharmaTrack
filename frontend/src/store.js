const listeners = new Map();

export const Events = {
  SALE_COMPLETED: 'SALE_COMPLETED',
  MEDICINES_CHANGED: 'MEDICINES_CHANGED',
};

export function emit(event) {
  const callbacks = listeners.get(event);
  if (callbacks) {
    callbacks.forEach((cb) => cb());
  }
}

export function subscribe(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(callback);
  return () => {
    const cbs = listeners.get(event);
    if (cbs) cbs.delete(callback);
  };
}
