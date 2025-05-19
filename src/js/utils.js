/**
 * @module utils (REFACTOR-V2.1)
 * @description Provides common utility functions.
 */

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = () => {
      timeout = null;
      func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
  // Ensure inMin and inMax are different to avoid division by zero.
  if (inMin === inMax) return outMin; // Or handle as an error, or return average, etc.
  const mapped = (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  // Clamp the output to the outMin/outMax range if desired,
  // though the original formula doesn't inherently do this.
  // For this project, it seems unclamped is fine.
  return mapped;
}

export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// console.log("[Utils] Utility functions loaded (REFACTOR-V2.1)");