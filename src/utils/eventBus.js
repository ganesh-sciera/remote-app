/**
 * eventBus.js — shared singleton event bus for cross-micro-frontend communication.
 *
 * Because both the shell and this remote declare this module (or the analytics
 * package itself) as a `shared singleton` in their Module Federation configs,
 * only ONE instance of this class exists at runtime — enabling true cross-app
 * messaging without polling or postMessage hacks.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 * Shell (host):
 *   import EventBus from 'analyticsApp/EventBus';
 *   EventBus.emit('user:updated', { id: 1, name: 'Jane' });
 *   EventBus.emit('auth:logout', {});
 *
 * Remote (analytics):
 *   import eventBus from '../utils/eventBus';
 *   const unsub = eventBus.on('user:updated', ({ id, name }) => {
 *     console.log('Shell told us user changed:', name);
 *   });
 *   // cleanup: unsub();
 *
 * ─── Supported events ────────────────────────────────────────────────────────
 *   'user:updated'   { id, name, role, ... }   — shell updated a user profile
 *   'user:deleted'   { id }                    — shell deleted a user
 *   'auth:logout'    {}                         — shell logged out; remote should clear caches
 *   'analytics:refresh' {}                     — shell requests analytics to re-fetch data
 */

class EventBus {
  constructor() {
    /** @type {Record<string, Function[]>} */
    this._listeners = {};
  }

  /**
   * Subscribe to an event.
   * @param {string}   event
   * @param {Function} handler
   * @returns {Function} unsubscribe
   */
  on(event, handler) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(handler);
    return () => this.off(event, handler);
  }

  /** Unsubscribe a specific handler. */
  off(event, handler) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(h => h !== handler);
  }

  /**
   * Emit an event to all current subscribers.
   * @param {string} event
   * @param {*}      payload
   */
  emit(event, payload) {
    (this._listeners[event] || []).forEach(handler => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Handler error for "${event}"`, err);
      }
    });
  }

  /** Subscribe once — auto-removes after first invocation. */
  once(event, handler) {
    const wrapped = (payload) => {
      handler(payload);
      this.off(event, wrapped);
    };
    return this.on(event, wrapped);
  }

  /** Remove all listeners for an event (or all events if none specified). */
  clear(event) {
    if (event) {
      delete this._listeners[event];
    } else {
      this._listeners = {};
    }
  }
}

// Singleton — shared across shell and remote via Module Federation `shared` config
const eventBus = new EventBus();
export default eventBus;
