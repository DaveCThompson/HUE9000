/**
 * @module rendererRegistry
 * @description A simple registry for storing and retrieving scan sequence
 * sub-job renderer functions. This decouples the FSM from the animation
 * implementations.
 */

const renderers = new Map();

export const rendererRegistry = {
  /**
   * Registers a renderer function with a given name.
   * @param {string} name - The name of the renderer (e.g., 'barFill', 'typeWindow').
   * @param {Function} rendererFunction - The function to execute for rendering.
   *        It should accept (targetElement, jobConfig, gsap) and return a GSAP timeline or a Promise.
   */
  register(name, rendererFunction) {
    if (renderers.has(name)) {
      console.warn(`[RendererRegistry] Renderer "${name}" is being overwritten.`);
    }
    renderers.set(name, rendererFunction);
  },

  /**
   * Retrieves a registered renderer function by name.
   * @param {string} name - The name of the renderer to retrieve.
   * @returns {Function} The requested renderer function.
   * @throws {Error} If the renderer is not found.
   */
  get(name) {
    if (!renderers.has(name)) {
      throw new Error(`[RendererRegistry] Renderer "${name}" not found. Ensure it was registered before being accessed.`);
    }
    return renderers.get(name);
  }
};