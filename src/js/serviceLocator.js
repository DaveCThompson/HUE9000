/**
 * @module serviceLocator
 * @description A simple Inversion of Control (IoC) container to manage and provide
 * access to shared manager instances, decoupling modules from each other.
 */

const services = new Map();

export const serviceLocator = {
  /**
   * Registers a service instance with a given name.
   * @param {string} name - The name of the service to register.
   * @param {object} service - The service instance.
   */
  register(name, service) {
    if (services.has(name)) {
      console.warn(`[ServiceLocator] Service "${name}" is being overwritten.`);
    }
    services.set(name, service);
  },

  /**
   * Retrieves a registered service by name.
   * @param {string} name - The name of the service to retrieve.
   * @param {boolean} [safe=false] - If true, returns null instead of throwing an error if the service is not found.
   * @returns {object|null} The requested service instance or null.
   * @throws {Error} If the service is not found and 'safe' is false.
   */
  get(name, safe = false) {
    if (!services.has(name)) {
      if (safe) {
        return null;
      }
      // This is a critical error, as it indicates a missing dependency or an issue in the initialization order.
      throw new Error(`[ServiceLocator] Service "${name}" not found. Ensure it was registered before being accessed.`);
    }
    return services.get(name);
  }
};