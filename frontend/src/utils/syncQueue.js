import * as offlineQueue from './offlineQueue';
import { api } from '../api/client';

let syncListenerAttached = false;

export function initSyncListener() {
  if (syncListenerAttached) return;
  syncListenerAttached = true;

  window.addEventListener('online', async () => {
    const entries = offlineQueue.getAll();
    if (entries.length === 0) return;

    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      try {
        // Note: photo files cannot be re-submitted from the queue (they can't be stored in localStorage)
        // The user will need to re-upload the photo manually
        await api.post('/cases', {
          ...entry.formData,
          // Remove photo-related fields that can't be submitted without the actual file
          photoFileName: undefined,
          photoNote: undefined,
        });
        offlineQueue.remove(i);
        // Dispatch a custom event to update the UI badge
        window.dispatchEvent(new CustomEvent('offlineQueueUpdated'));
        showToast('✅ Queued report submitted successfully.', 'success');
      } catch {
        showToast('❌ Failed to submit queued report — please retry manually.', 'error');
      }
    }
  });
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 9999;
    padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;
    background: ${type === 'success' ? '#d1fae5' : '#fef2f2'};
    color: ${type === 'success' ? '#065f46' : '#991b1b'};
    border: 1px solid ${type === 'success' ? '#6ee7b7' : '#fca5a5'};
    box-shadow: 0 4px 12px rgba(0,0,0,.1);
    animation: slideIn .3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
