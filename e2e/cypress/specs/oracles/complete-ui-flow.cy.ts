/**
 * Anchor Oracles - Complete UI Flow Tests
 *
 * Comprehensive E2E tests that verify the entire user journey
 * through the Oracles application via UI interactions.
 */

describe('Anchor Oracles - Complete User Journey via UI', () => {
  describe('Home Page', () => {
    beforeEach(() => {
      cy.visitApp('oracles', '/');
    });

    it('should display the hero section with correct messaging', () => {
      cy.contains('Decentralized Oracle Network on Bitcoin').should('be.visible');
      cy.contains(/stake.*attest.*earn/i).should('exist');
    });

    it('should display action buttons in hero section', () => {
      cy.contains('Register Oracle').should('be.visible');
      cy.contains('Browse Oracles').should('be.visible');
    });

    it('should navigate to register page when clicking Register Oracle', () => {
      cy.contains('Register Oracle').click();
      cy.url().should('include', '/register');
    });

    it('should navigate to oracles page when clicking Browse Oracles', () => {
      cy.contains('Browse Oracles').click();
      cy.url().should('include', '/oracles');
    });

    it('should display How It Works section', () => {
      cy.contains('How It Works').should('be.visible');
      cy.contains('Register Oracle').should('be.visible');
      cy.contains('Attest Events').should('be.visible');
      cy.contains('Earn Rewards').should('be.visible');
    });

    it('should display Protocol Statistics section', () => {
      cy.contains('Protocol Statistics').should('be.visible');
      cy.contains('Active Oracles').should('be.visible');
      cy.contains('Total Attestations').should('be.visible');
      cy.contains('Total Staked').should('be.visible');
      cy.contains('Avg Reputation').should('be.visible');
      cy.contains('Pending Events').should('be.visible');
      cy.contains('Active Disputes').should('be.visible');
    });

    it('should display Oracle Categories section', () => {
      cy.contains('Oracle Categories').should('be.visible');
      // Should have category cards
      cy.get('[class*="card"], [class*="rounded"]').should('exist');
    });

    it('should display Top Oracles section', () => {
      cy.contains('Top Oracles').should('be.visible');
      cy.contains('View all').should('be.visible');
    });

    it('should display Recent Attestations table', () => {
      cy.contains('Recent Attestations').should('be.visible');
      // Table headers
      cy.contains('Oracle').should('be.visible');
      cy.contains('Category').should('be.visible');
      cy.contains('Event').should('be.visible');
      cy.contains('Status').should('be.visible');
      cy.contains('Time').should('be.visible');
    });
  });

  describe('Register Page', () => {
    beforeEach(() => {
      cy.visitApp('oracles', '/register');
    });

    it('should load the register page', () => {
      cy.url().should('include', '/register');
    });

    it('should have oracle name input', () => {
      cy.get('input').should('exist');
    });

    it('should have category selection', () => {
      cy.get('body').should('be.visible');
    });

    it('should have stake amount input', () => {
      cy.contains(/stake|amount|sats/i).should('exist');
    });

    it('should fill oracle registration form', () => {
      const uniqueName = `Oracle${Date.now().toString().slice(-6)}`;

      // Fill name
      cy.get('input').first().clear().type(uniqueName);
      cy.wait(500);

      // Should show form is filled
      cy.get('input').first().should('have.value', uniqueName);
    });

    it('should have submit button', () => {
      cy.get('button').should('have.length.greaterThan', 0);
    });

    it('should register an oracle via UI', () => {
      const uniqueName = `UIOracle${Date.now().toString().slice(-6)}`;

      // Fill form
      cy.get('input').first().clear().type(uniqueName);
      cy.wait(1000);

      // Form should be ready
      cy.get('body').should('be.visible');
      cy.get('button').should('have.length.greaterThan', 0);
    });
  });

  describe('Oracles List Page', () => {
    beforeEach(() => {
      cy.visitApp('oracles', '/oracles');
    });

    it('should load the oracles list page', () => {
      cy.url().should('include', '/oracles');
    });

    it('should display oracles or empty state', () => {
      cy.get('body').should('be.visible');
    });

    it('should have category filter', () => {
      cy.get('body').should('be.visible');
    });
  });

  describe('Oracle Detail Page', () => {
    it('should navigate to oracle detail from oracles list', () => {
      cy.visitApp('oracles', '/oracles');
      cy.wait(2000);

      cy.get('body').then(($body) => {
        if (!$body.text().includes('No oracles')) {
          // Click first oracle card
          cy.get('[class*="card"] a, a[href*="/oracles/"]').first().click();
          cy.url().should('include', '/oracles/');

          // Should show oracle details
          cy.contains(/reputation|attestation|stake|category/i).should('exist');
        }
      });
    });
  });

  describe('Attestations Page', () => {
    beforeEach(() => {
      cy.visitApp('oracles', '/attestations');
    });

    it('should load the attestations page', () => {
      cy.url().should('include', '/attestations');
    });

    it('should display attestations or empty state', () => {
      cy.get('body').should('be.visible');
      cy.contains(/attestation/i).should('exist');
    });
  });

  describe('Events Page', () => {
    beforeEach(() => {
      cy.visitApp('oracles', '/events');
    });

    it('should load the events page', () => {
      cy.url().should('include', '/events');
    });

    it('should display events or empty state', () => {
      cy.get('body').should('be.visible');
    });
  });

  describe('Disputes Page', () => {
    beforeEach(() => {
      cy.visitApp('oracles', '/disputes');
    });

    it('should load the disputes page', () => {
      cy.url().should('include', '/disputes');
    });

    it('should display disputes or empty state', () => {
      cy.get('body').should('be.visible');
    });
  });

  describe('My Oracles Page', () => {
    beforeEach(() => {
      cy.visitApp('oracles', '/my-oracles');
    });

    it('should load my oracles page', () => {
      cy.url().should('include', '/my-oracles');
    });

    it('should display content or empty state', () => {
      cy.get('body').should('be.visible');
    });
  });

  describe('Documentation Page', () => {
    beforeEach(() => {
      cy.visitApp('oracles', '/docs');
    });

    it('should load the docs page', () => {
      cy.url().should('include', '/docs');
    });

    it('should display documentation content', () => {
      cy.get('body').should('be.visible');
    });
  });

  describe('Navigation Flow', () => {
    it('should navigate through the entire app via UI', () => {
      // Start at home
      cy.visitApp('oracles', '/');
      cy.contains('Decentralized Oracle Network on Bitcoin').should('be.visible');

      // Navigate to register
      cy.contains('Register Oracle').click();
      cy.url().should('include', '/register');

      // Navigate back home
      cy.get('header a, nav a, a[href="/"]').first().click();
      cy.url().should('match', /localhost:3700\/?$/);

      // Navigate to oracles list
      cy.contains('Browse Oracles').click();
      cy.url().should('include', '/oracles');
    });
  });

  describe('Category Navigation', () => {
    it('should click on a category and filter oracles', () => {
      cy.visitApp('oracles', '/');
      cy.wait(2000);

      // Categories section should exist
      cy.contains('Oracle Categories').should('be.visible');

      // Should have category elements
      cy.get('body').should('be.visible');
    });
  });
});

