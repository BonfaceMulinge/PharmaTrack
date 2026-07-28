import { subscribe as busSubscribe, Events } from '../store';
import { authFetch, API_URL } from '../api';
import { playNotificationSound } from './notificationSound';

const MAX_UNREAD = 20;
const POLL_INTERVAL = 30000;

let notifications = [];
let badgeListeners = new Set();
let listListeners = new Set();
let pollTimer = null;
let initialized = false;

function emitBadge() {
  const count = notifications.length;
  badgeListeners.forEach((cb) => cb(count));
}

function emitList() {
  listListeners.forEach((cb) => cb([...notifications]));
}

function addNotification(notif) {
  if (notifications.some((n) => n.id === notif.id)) return;
  notifications = [notif, ...notifications].slice(0, MAX_UNREAD);
  playNotificationSound();
  emitBadge();
  emitList();
}

export function dismissNotification(id) {
  notifications = notifications.filter((n) => n.id !== id);
  emitBadge();
  emitList();
  authFetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
}

export function dismissAll() {
  const ids = notifications.map((n) => n.id);
  notifications = [];
  emitBadge();
  emitList();
  if (ids.length > 0) {
    authFetch(`${API_URL}/notifications/read-all`, { method: 'PATCH' }).catch(() => {});
  }
}

export function getUnreadCount() {
  return notifications.length;
}

export function onBadgeChange(cb) {
  badgeListeners.add(cb);
  return () => badgeListeners.delete(cb);
}

export function onListChange(cb) {
  listListeners.add(cb);
  return () => listListeners.delete(cb);
}

async function fetchServerNotifications() {
  try {
    const res = await authFetch(`${API_URL}/notifications`);
    if (!res.ok) return;
    const data = await res.json();
    const existing = new Set(notifications.map((n) => n.id));
    data.forEach((n) => {
      if (!existing.has(n.id)) addNotification(n);
    });
  } catch {
    // silent
  }
}

function handleSaleCompleted() {
  addNotification({
    id: `sale-${Date.now()}`,
    type: 'SALE_COMPLETED',
    title: 'Sale Completed',
    message: 'A new sale has been processed successfully.',
    createdAt: new Date().toISOString(),
  });
}

function handleMedicinesChanged() {
  addNotification({
    id: `med-${Date.now()}`,
    type: 'MEDICINES_CHANGED',
    title: 'Inventory Updated',
    message: 'Medicine inventory has been modified.',
    createdAt: new Date().toISOString(),
  });
  fetchServerNotifications();
}

function startPolling() {
  if (pollTimer) return;
  fetchServerNotifications();
  pollTimer = setInterval(fetchServerNotifications, POLL_INTERVAL);
}

export function initNotifications() {
  if (initialized) return;
  initialized = true;
  startPolling();
  busSubscribe(Events.SALE_COMPLETED, handleSaleCompleted);
  busSubscribe(Events.MEDICINES_CHANGED, handleMedicinesChanged);
}
