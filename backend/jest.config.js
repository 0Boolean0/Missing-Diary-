/**
 * Jest configuration for the backend.
 *
 * The backend uses ES modules ("type": "module" in package.json), so we need
 * --experimental-vm-modules (set in the test script). Jest automatically treats
 * .js files as ESM when the nearest package.json has "type": "module".
 *
 * Note: The existing sighting-*.test.js files use Node's built-in `node:test`
 * runner and are excluded here. Only the police-role-restriction tests use Jest.
 */
export default {
  // Use Node.js test environment
  testEnvironment: 'node',

  // Only match the police-role-restriction test files (which use Jest + fast-check).
  // The existing sighting-*.test.js files use Node's native test runner and are excluded.
  testMatch: ['**/src/tests/police-role-restriction*.test.js'],

  // No transform needed — Node handles ESM natively with --experimental-vm-modules
  transform: {},
};
