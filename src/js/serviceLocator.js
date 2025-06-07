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
   * @returns {object} The requested service instance.
   * @throws {Error} If the service is not found.
   */
  get(name) {
    if (!services.has(name)) {
      // This is a critical error, as it indicates a missing dependency or an issue in the initialization order.
      throw new Error(`[ServiceLocator] Service "${name}" not found. Ensure it was registered in main.js before being accessed.`);
    }
    return services.get(name);
  }
};