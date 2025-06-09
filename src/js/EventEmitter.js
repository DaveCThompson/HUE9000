/**
 * @module EventEmitter
 * @description A simple, generic event emitter (pub/sub) class.
 */
export class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribes a listener function to an event.
     * @param {string} eventName - The name of the event to subscribe to.
     * @param {Function} listener - The callback function to execute when the event is emitted.
     * @returns {Function} An unsubscribe function to remove this specific listener.
     */
    subscribe(eventName, listener) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(listener);
        
        // Return a function to unsubscribe
        return () => {
            if (this.events[eventName]) {
                this.events[eventName] = this.events[eventName].filter(l => l !== listener);
            }
        };
    }

    /**
     * Emits an event, calling all subscribed listeners with the provided payload.
     * @param {string} eventName - The name of the event to emit.
     * @param {*} [payload] - The data to pass to the listeners.
     */
    emit(eventName, payload) {
        if (this.events[eventName]) {
            // Iterate over a copy of the array in case a listener unsubscribes itself
            [...this.events[eventName]].forEach(listener => {
                try {
                    listener(payload);
                } catch (e) {
                    console.error(`Error in listener for event "${eventName}":`, e);
                }
            });
        }
    }
}