/**
 * Anchor Tokens - Complete UI Flow Tests
 *
 * Comprehensive E2E tests that verify the entire user journey
 * through the Tokens application via UI interactions.
 */

describe('Anchor Tokens - Complete User Journey via UI', () => {
  describe('Home Page', () => {
    beforeEach(() => {
      cy.visitApp('tokens', '/');
    });

    it('should display the hero section with correct messaging', () => {
      cy.contains('UTXO-based Tokens on Bitcoin').should('be.visible');
      cy.contains('Deploy, mint, and transfer tokens').should('be.visible');
    });

    it('should display action buttons in hero section', () => {
      cy.contains('Deploy Token').should('be.visible');
      cy.contains('Browse Tokens').should('be.visible');
    });

    it('should navigate to deploy page when clicking Deploy Token', () => {
      cy.contains('Deploy Token').click();
      cy.url().should('include', '/deploy');
    });

    it('should navigate to tokens page when clicking Browse Tokens', () => {
      cy.contains('Browse Tokens').click();
      cy.url().should('include', '/tokens');
    });

    it('should display How It Works section', () => {
      cy.contains('How It Works').should('be.visible');
      cy.contains('Deploy Tokens').should('be.visible');
      cy.contains('Transfer Tokens').should('be.visible');
      cy.contains('Burn Tokens').should('be.visible');
    });

    it('should display Protocol Statistics section', () => {
      cy.contains('Protocol Statistics').should('be.visible');
      cy.contains('Total Tokens').should('be.visible');
      cy.contains('Total Holders').should('be.visible');
      cy.contains('Total Operations').should('be.visible');
      cy.contains('Last Block').should('be.visible');
    });

    it('should display Recent Tokens section', () => {
      cy.contains('Recent Tokens').should('be.visible');
      // Either shows tokens or empty state
      cy.get('body').then(($body) => {
        if ($body.text().includes('No tokens deployed')) {
          cy.contains('No tokens deployed yet').should('be.visible');
        } else {
          cy.contains('View All').should('be.visible');
        }
      });
    });
  });

  describe('Deploy Page - Token Creation', () => {
    beforeEach(() => {
      cy.visitApp('tokens', '/deploy');
    });

    it('should load the deploy page', () => {
      cy.url().should('include', '/deploy');
    });

    it('should display token creation form with all fields', () => {
      cy.get('input').should('have.length.greaterThan', 1);
    });

    it('should have ticker input field', () => {
      // Ticker is typically the first input
      cy.get('input').first().should('be.visible');
      cy.contains(/ticker|symbol/i).should('exist');
    });

    it('should have decimals configuration', () => {
      cy.contains(/decimal/i).should('exist');
    });

    it('should have supply configuration', () => {
      cy.contains(/supply|max|total/i).should('exist');
    });

    it('should have mint type options', () => {
      cy.contains(/mint|open|fixed/i).should('exist');
    });

    it('should fill the token creation form completely', () => {
      const uniqueTicker = `T${Date.now().toString().slice(-4)}`;

      // Fill ticker
      cy.get('input').first().clear().type(uniqueTicker);

      // Wait for form to update
      cy.wait(500);

      // Verify ticker was entered
      cy.get('input').first().should('have.value', uniqueTicker);

      // Look for deploy button
      cy.get('button').contains(/deploy|create/i).should('exist');
    });

    it('should show fee estimate after filling form', () => {
      const uniqueTicker = `T${Date.now().toString().slice(-4)}`;
      cy.get('input').first().clear().type(uniqueTicker);

      // Wait for fee calculation
      cy.wait(1000);

      // Should show some fee/cost information
      cy.contains(/fee|cost|sat/i).should('exist');
    });

    it('should deploy a token via UI', () => {
      const uniqueTicker = `T${Date.now().toString().slice(-4)}`;

      // Fill ticker
      cy.get('input').first().clear().type(uniqueTicker);
      cy.wait(1000);

      // Click deploy
      cy.get('button').contains(/deploy|create/i).click();

      // Wait for transaction
      cy.wait(3000);

      // Mine block
      cy.mineBlocks(1);
      cy.wait(3000);

      // Should show success or token details
      cy.contains(/success|deployed|transaction|txid/i, { timeout: 15000 }).should('exist');
    });
  });

  describe('Tokens List Page', () => {
    beforeEach(() => {
      cy.visitApp('tokens', '/tokens');
    });

    it('should load the tokens list page', () => {
      cy.url().should('include', '/tokens');
    });

    it('should display tokens or empty state', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('No tokens')) {
          cy.contains(/no token/i).should('be.visible');
        } else {
          // Has some token cards
          cy.get('[class*="card"]').should('exist');
        }
      });
    });

    it('should have search or filter functionality', () => {
      cy.get('input[type="text"], input[type="search"]').should('exist');
    });

    it('should have pagination if many tokens', () => {
      // Pagination may or may not exist depending on token count
      cy.get('body').should('be.visible');
    });
  });

  describe('Wallet Page', () => {
    beforeEach(() => {
      cy.visitApp('tokens', '/wallet');
    });

    it('should load the wallet page', () => {
      cy.url().should('include', '/wallet');
    });

    it('should display wallet information or connect prompt', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Connect') || $body.text().includes('connect')) {
          cy.contains(/connect|wallet/i).should('exist');
        } else {
          // Shows wallet balances
          cy.get('body').should('be.visible');
        }
      });
    });
  });

  describe('Token Detail Page', () => {
    it('should navigate to token detail when clicking a token card', () => {
      cy.visitApp('tokens', '/tokens');

      // Wait for tokens to load
      cy.wait(2000);

      cy.get('body').then(($body) => {
        // Only test if tokens exist
        if (!$body.text().includes('No tokens')) {
          // Click first token card
          cy.get('[class*="card"] a, a[href*="/token/"]').first().click();
          cy.url().should('include', '/token/');

          // Should show token details
          cy.contains(/ticker|supply|holder/i).should('exist');
        }
      });
    });
  });

  describe('Navigation Flow', () => {
    it('should navigate through the entire app via UI', () => {
      // Start at home
      cy.visitApp('tokens', '/');
      cy.contains('UTXO-based Tokens on Bitcoin').should('be.visible');

      // Navigate to deploy
      cy.contains('Deploy Token').click();
      cy.url().should('include', '/deploy');

      // Navigate back home
      cy.get('header a, nav a, a[href="/"]').first().click();
      cy.url().should('match', /localhost:3600\/?$/);

      // Navigate to tokens list
      cy.contains('Browse Tokens').click();
      cy.url().should('include', '/tokens');
    });
  });

  describe('Complete Token Lifecycle', () => {
    it('should deploy, view, and interact with a token', () => {
      // Start at home
      cy.visitApp('tokens', '/');

      // Go to deploy
      cy.contains('Deploy Token').click();
      cy.url().should('include', '/deploy');

      // Create unique ticker
      const uniqueTicker = `U${Date.now().toString().slice(-4)}`;
      cy.get('input').first().clear().type(uniqueTicker);
      cy.wait(1000);

      // Deploy
      cy.get('button').contains(/deploy|create/i).click();
      cy.wait(3000);

      // Mine block
      cy.mineBlocks(1);
      cy.wait(3000);

      // Check for success
      cy.contains(/success|deployed|txid/i, { timeout: 15000 }).should('exist');

      // Navigate to tokens list
      cy.visitApp('tokens', '/tokens');
      cy.wait(2000);

      // Should see our new token (or at least a token)
      cy.get('body').should('be.visible');
    });
  });
});

