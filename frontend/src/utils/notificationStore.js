import { subscribe as busSubscribe, Events } from '../store';
import { authFetch, API_URL } from '../api';
import { playNotificationSound } from './notificationSound';

const MAX_UNREAD = 20;
const POLL_INTERVAL = 30000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let notifications = [];
let dismissedIds = new Set();
let badgeListeners = new Set();
let listListeners = new Set();
let pollTimer = null;
let initialized = false;

function emitBadge() {
  const count = notifications.length;
  badgeListeners.forEach((cb) => cb(count));
}

function emitList() {
  const snapshot = [...notifications];
  listListeners.forEach((cb) => cb(snapshot));
}

function notifyAll() {
  emitBadge();
  emitList();
}

function addNotification(notif) {
  if (dismissedIds.has(notif.id)) return;
  if (notifications.some((n) => n.id === notif.id)) return;
  notifications = [notif, ...notifications].slice(0, MAX_UNREAD);
  playNotificationSound();
  notifyAll();
}

export function dismissNotification(id) {
  dismissedIds.add(id);
  notifications = notifications.filter((n) => n.id !== id);
  notifyAll();

  if (UUID_RE.test(id)) {
    authFetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  }
}

export function dismissAll() {
  const serverIds = notifications.filter((n) => UUID_RE.test(n.id)).map((n) => n.id);
  notifications.forEach((n) => dismissedIds.add(n.id));
  notifications = [];
  notifyAll();

  if (serverIds.length > 0) {
    authFetch(`${API_URL}/notifications/read-all`, { method: 'PATCH' }).catch(() => {});
  }
}

export function getUnreadCount() {
  return notifications.length;
}

export function onBadgeChange(cb) {
  badgeListeners.add(cb);
  cb(notifications.length);
  return () => badgeListeners.delete(cb);
}

export function onListChange(cb) {
  listListeners.add(cb);
  cb([...notifications]);
  return () => listListeners.delete(cb);
}

async function fetchServerNotifications() {
  try {
    const res = await authFetch(`${API_URL}/notifications`);
    if (!res.ok) return;
    const data = await res.json();
    data.forEach((n) => addNotification(n));
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
