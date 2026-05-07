import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom to simulate a browser environment for React component tests
    environment: 'jsdom',

    // Expose Vitest globals (describe, it, expect, etc.) so @testing-library/jest-dom
    // can extend expect in the setup file without an explicit import
    globals: true,

    // Run this file before each test suite to set up @testing-library/jest-dom matchers
    setupFiles: ['./src/tests/setup.js'],

    // Match test files in src/tests/
    include: ['src/tests/**/*.test.{js,jsx}', 'src/tests/**/*.property.test.{js,jsx}'],
  },
});
