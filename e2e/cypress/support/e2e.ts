// Cypress E2E Support File
// This file is loaded before every test file

import './commands';

// Global before hook - runs once before all tests
before(() => {
  // Bypass setup wizard before running any tests
  cy.bypassSetup();
});

// Global beforeEach hook - runs before each test
beforeEach(() => {
  // Clear local storage and cookies between tests for isolation
  cy.clearLocalStorage();
  cy.clearCookies();
});

// Handle uncaught exceptions to prevent test failures
Cypress.on('uncaught:exception', (err) => {
  // Ignore React hydration errors and other common non-critical errors
  if (
    err.message.includes('hydrat') ||
    err.message.includes('Minified React error') ||
    err.message.includes('ResizeObserver')
  ) {
    return false;
  }
  return true;
});

// Log API requests for debugging
Cypress.on('fail', (error, runnable) => {
  console.error('Test failed:', runnable.title);
  console.error('Error:', error.message);
  throw error;
});

