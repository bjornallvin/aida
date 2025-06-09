/**
 * Legacy entry point for TRADFRI control
 * @deprecated Use ./tradfri/index.ts for new imports
 */

// Re-export everything from the new modular structure
export * from "./tradfri";
export { tradfriController as default } from "./tradfri";
