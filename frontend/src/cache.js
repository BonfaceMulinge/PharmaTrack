import { authFetch, API_URL } from './api';
import { subscribe, Events } from './store';

let medicines = [];
let loading = false;
let fetched = false;
let listeners = new Set();
let inflight = null;

function notify() {
  const snapshot = [...medicines];
  listeners.forEach((cb) => cb(snapshot));
}

export function getMedicines() {
  return medicines;
}

export function isMedicineCacheReady() {
  return fetched;
}

export function onMedicinesChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function fetchMedicines(force = false) {
  if (loading && inflight && !force) return inflight;
  loading = true;

  inflight = authFetch(`${API_URL}/medicines`)
    .then(async (res) => {
      if (res.ok) {
        medicines = await res.json();
        fetched = true;
        notify();
      }
      return medicines;
    })
    .catch((err) => {
      console.error('[MedicineCache] Fetch error:', err);
      return medicines;
    })
    .finally(() => {
      loading = false;
      inflight = null;
    });

  return inflight;
}

export function applyOptimisticUpdate(id, updates) {
  medicines = medicines.map((m) => (m.id === id ? { ...m, ...updates } : m));
  notify();
}

export function applyOptimisticAdd(medicine) {
  medicines = [medicine, ...medicines];
  notify();
}

export function applyOptimisticDelete(id) {
  medicines = medicines.filter((m) => m.id !== id);
  notify();
}

export function applyOptimisticBulkUpdate(updatesMap) {
  medicines = medicines.map((m) => {
    const updates = updatesMap.get(m.id);
    return updates ? { ...m, ...updates } : m;
  });
  notify();
}

subscribe(Events.MEDICINES_CHANGED, () => fetchMedicines(true));
