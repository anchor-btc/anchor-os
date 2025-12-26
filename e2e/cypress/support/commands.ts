// Cypress Custom Commands for Anchor OS E2E Tests

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Bypass the setup wizard by marking installation as complete
       */
      bypassSetup(): Chainable<void>;

      /**
       * Navigate to a specific Anchor app
       * @param app - App name (dashboard, domains, proofs, tokens, etc.)
       * @param path - Path within the app (default: '/')
       */
      visitApp(app: string, path?: string): Chainable<void>;

      /**
       * Mine blocks on regtest network
       * @param count - Number of blocks to mine (default: 1)
       */
      mineBlocks(count?: number): Chainable<void>;

      /**
       * Wait for a transaction to be confirmed (mines a block and waits for indexer)
       */
      waitForTx(): Chainable<void>;

      /**
       * Get the current wallet balance
       */
      getWalletBalance(): Chainable<{ confirmed: number; unconfirmed: number }>;

      /**
       * Wait for an element to be visible and interactable
       * @param selector - CSS selector
       * @param timeout - Timeout in ms (default: 10000)
       */
      waitForElement(selector: string, timeout?: number): Chainable<JQuery<HTMLElement>>;

      /**
       * Fill a form field with better reliability
       * @param selector - CSS selector
       * @param value - Value to type
       */
      fillField(selector: string, value: string): Chainable<void>;
    }
  }
}

// Bypass the setup wizard
Cypress.Commands.add('bypassSetup', () => {
  return cy.task('bypassSetupWizard').then((result: any) => {
    if (result && !result.success) {
      cy.log('Warning: Failed to bypass setup wizard', result.error);
    }
  });
});

// Navigate to a specific app
Cypress.Commands.add('visitApp', (app: string, path = '/') => {
  const baseUrl = Cypress.env(app);
  if (!baseUrl) {
    throw new Error(`Unknown app: ${app}. Available apps: dashboard, domains, proofs, tokens, threads, canvas, places, oracles, predictions`);
  }
  return cy.visit(`${baseUrl}${path}`);
});

// Mine blocks on regtest
Cypress.Commands.add('mineBlocks', (count = 1) => {
  return cy.task('mineBlocks', count).then(() => {
    cy.log(`Mined ${count} block(s)`);
  });
});

// Wait for transaction confirmation
Cypress.Commands.add('waitForTx', () => {
  return cy.mineBlocks(1).then(() => {
    // Wait for indexer to process the new block
    return cy.wait(2000);
  });
});

// Get wallet balance
Cypress.Commands.add('getWalletBalance', () => {
  return cy.task('getBalance');
});

// Wait for element to be visible and interactable
Cypress.Commands.add('waitForElement', (selector: string, timeout = 10000) => {
  return cy.get(selector, { timeout }).should('be.visible');
});

// Fill form field with clear and type
Cypress.Commands.add('fillField', (selector: string, value: string) => {
  return cy.get(selector).clear().type(value);
});

export {};

