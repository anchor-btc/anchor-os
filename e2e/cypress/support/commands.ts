// Cypress Custom Commands for Anchor OS E2E Tests

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Bypass the setup wizard by marking installation as complete
       */
      bypassSetup(): Chainable<void>;

      /**
       * Reset the setup wizard to incomplete state for testing the setup flow
       */
      resetSetup(): Chainable<void>;

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

      // ==================== Predictions Commands ====================

      /**
       * Create a prediction market via API
       */
      createPredictionMarket(data: {
        question: string;
        description?: string;
        resolution_block: number;
        oracle_pubkey: string;
        initial_liquidity_sats?: number;
      }): Chainable<any>;

      /**
       * Get all prediction markets
       */
      getPredictionMarkets(): Chainable<any[]>;

      /**
       * Place a bet on a prediction market
       */
      placePredictionBet(data: {
        marketId: string;
        outcome: number;
        amount_sats: number;
        user_pubkey: string;
      }): Chainable<any>;

      /**
       * Claim prediction winnings with signature verification
       */
      claimPredictionWinnings(data: {
        marketId: string;
        position_id: number;
        payout_address: string;
        user_pubkey: string;
        signature: string;
      }): Chainable<any>;

      /**
       * Attempt to claim without signature (should fail - for security testing)
       */
      claimWithoutSignature(data: {
        marketId: string;
        position_id: number;
        payout_address: string;
      }): Chainable<any>;

      /**
       * Get market positions
       */
      getMarketPositions(marketId: string): Chainable<any[]>;

      /**
       * Get market winners
       */
      getMarketWinners(marketId: string): Chainable<any[]>;
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

// Reset the setup wizard to incomplete state
Cypress.Commands.add('resetSetup', () => {
  return cy.task('resetSetupWizard').then((result: any) => {
    if (result && !result.success) {
      cy.log('Warning: Failed to reset setup wizard', result.error);
    }
  });
});

// Navigate to a specific app
Cypress.Commands.add('visitApp', (app: string, path = '/') => {
  const baseUrl = Cypress.env(app);
  if (!baseUrl) {
    throw new Error(
      `Unknown app: ${app}. Available apps: dashboard, domains, proofs, tokens, threads, canvas, places, oracles, predictions`
    );
  }
  return cy.visit(`${baseUrl}${path}`);
});

// Mine blocks on regtest
Cypress.Commands.add('mineBlocks', (count = 1) => {
  return cy.task('mineBlocks', count).then((result: { success: boolean; error?: string }) => {
    if (result.success) {
      cy.log(`Mined ${count} block(s)`);
    } else {
      cy.log(`Mine blocks skipped: ${result.error}`);
    }
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

// ==================== Predictions Commands ====================

// Create a prediction market via API
Cypress.Commands.add(
  'createPredictionMarket',
  (data: {
    question: string;
    description?: string;
    resolution_block: number;
    oracle_pubkey: string;
    initial_liquidity_sats?: number;
  }) => {
    return cy.task('createPredictionMarket', data);
  }
);

// Get all prediction markets
Cypress.Commands.add('getPredictionMarkets', () => {
  return cy.task('getPredictionMarkets');
});

// Place a bet on a prediction market
Cypress.Commands.add(
  'placePredictionBet',
  (data: { marketId: string; outcome: number; amount_sats: number; user_pubkey: string }) => {
    return cy.task('placePredictionBet', data);
  }
);

// Attempt to claim winnings (with signature)
Cypress.Commands.add(
  'claimPredictionWinnings',
  (data: {
    marketId: string;
    position_id: number;
    payout_address: string;
    user_pubkey: string;
    signature: string;
  }) => {
    return cy.task('claimPredictionWinnings', data);
  }
);

// Attempt to claim without signature (should fail)
Cypress.Commands.add(
  'claimWithoutSignature',
  (data: { marketId: string; position_id: number; payout_address: string }) => {
    return cy.task('claimWithoutSignature', data);
  }
);

// Get market positions
Cypress.Commands.add('getMarketPositions', (marketId: string) => {
  return cy.task('getMarketPositions', marketId);
});

// Get market winners
Cypress.Commands.add('getMarketWinners', (marketId: string) => {
  return cy.task('getMarketWinners', marketId);
});

export {};
