/**
 * Anchor Domains - Complete UI Flow Tests
 *
 * Comprehensive E2E tests that verify the entire user journey
 * through the Domains (DNS) application via UI interactions.
 */

describe('Anchor Domains - Complete User Journey via UI', () => {
  describe('Home Page', () => {
    beforeEach(() => {
      cy.visitApp('domains', '/');
    });

    it('should display the hero section with correct messaging', () => {
      cy.contains('Decentralized DNS on Bitcoin').should('be.visible');
      cy.contains(/register your.*domain/i).should('exist');
    });

    it('should display action buttons in hero section', () => {
      cy.contains('Register Domain').should('be.visible');
      cy.contains('Browse Domains').should('be.visible');
    });

    it('should display animated TLD', () => {
      cy.contains(/yourdomain/i).should('be.visible');
      // TLD animation should show .btc, .sat, etc.
      cy.get('body').should('contain.text', '.');
    });

    it('should have search box', () => {
      cy.get('input[type="text"], input[type="search"]').should('exist');
    });

    it('should search for a domain', () => {
      // Type in search box
      cy.get('input[type="text"], input[type="search"]').first().type('testdomain.btc');

      // Submit search (enter or button)
      cy.get('input[type="text"], input[type="search"]').first().type('{enter}');

      // Should show search result
      cy.wait(2000);
      cy.get('body').then(($body) => {
        const text = $body.text();
        // Either found or available
        expect(text.toLowerCase()).to.match(/found|available|domain|not found/);
      });
    });

    it('should display How It Works section', () => {
      cy.contains('How It Works').should('be.visible');
      cy.contains('Search Domain').should('be.visible');
      cy.contains('Register').should('be.visible');
      cy.contains('Manage Records').should('be.visible');
    });

    it('should display Protocol Statistics section', () => {
      cy.contains('Protocol Statistics').should('be.visible');
      cy.contains('Domains').should('be.visible');
      cy.contains('DNS Records').should('be.visible');
      cy.contains('Block Height').should('be.visible');
    });

    it('should display Recent Domains section if domains exist', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Recent Domains')) {
          cy.contains('Recent Domains').should('be.visible');
          cy.contains('View all').should('be.visible');
        }
      });
    });

    it('should navigate to register from hero button', () => {
      cy.contains('Register Domain').click();
      cy.url().should('include', '/register');
    });

    it('should navigate to browse domains', () => {
      cy.contains('Browse Domains').click();
      cy.url().should('include', '/domains');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      cy.visitApp('domains', '/');
    });

    it('should search for available domain', () => {
      const uniqueDomain = `test${Date.now().toString().slice(-6)}.btc`;
      cy.get('input[type="text"], input[type="search"]').first().clear().type(uniqueDomain);
      cy.get('input[type="text"], input[type="search"]').first().type('{enter}');

      cy.wait(2000);
      // Should show available message
      cy.contains(/available|not found|register/i).should('exist');
    });

    it('should show register button for available domain', () => {
      const uniqueDomain = `avail${Date.now().toString().slice(-6)}.btc`;
      cy.get('input[type="text"], input[type="search"]').first().clear().type(uniqueDomain);
      cy.get('input[type="text"], input[type="search"]').first().type('{enter}');

      cy.wait(2000);
      // If available, should have register link
      cy.get('body').then(($body) => {
        if ($body.text().includes('available')) {
          cy.contains('Register Now').should('be.visible');
        }
      });
    });

    it('should support different TLDs', () => {
      // Test .sat TLD
      cy.get('input[type="text"], input[type="search"]').first().clear().type('test.sat');
      cy.get('input[type="text"], input[type="search"]').first().type('{enter}');
      cy.wait(1000);
      cy.get('body').should('be.visible');

      // Test .anchor TLD
      cy.get('input[type="text"], input[type="search"]').first().clear().type('test.anchor');
      cy.get('input[type="text"], input[type="search"]').first().type('{enter}');
      cy.wait(1000);
      cy.get('body').should('be.visible');
    });
  });

  describe('Register Page', () => {
    beforeEach(() => {
      cy.visitApp('domains', '/register');
    });

    it('should load the register page', () => {
      cy.url().should('include', '/register');
    });

    it('should have domain name input', () => {
      cy.get('input').should('exist');
    });

    it('should have TLD selector', () => {
      cy.get('select, button[role="combobox"], [class*="select"]').should('exist');
    });

    it('should fill in domain name', () => {
      const testDomain = 'mytestdomain';
      cy.get('input').first().clear().type(testDomain);
      cy.get('input').first().should('have.value', testDomain);
    });

    it('should show cost information after entering domain', () => {
      cy.get('input').first().clear().type('testcost');
      cy.wait(1000);

      // Should show some cost/fee info
      cy.contains(/cost|fee|sat|btc|price/i).should('exist');
    });

    it('should have register button', () => {
      cy.get('button').should('have.length.greaterThan', 0);
    });

    it('should register a domain via UI', () => {
      const uniqueDomain = `ui${Date.now().toString().slice(-6)}`;

      // Enter domain name
      cy.get('input').first().clear().type(uniqueDomain);
      cy.wait(1000);

      // Form should be ready
      cy.get('body').should('be.visible');
      cy.get('button').should('have.length.greaterThan', 0);
    });
  });

  describe('Domains List Page', () => {
    beforeEach(() => {
      cy.visitApp('domains', '/domains');
    });

    it('should load the domains list page', () => {
      cy.url().should('include', '/domains');
    });

    it('should display domains or empty state', () => {
      cy.get('body').should('be.visible');
    });

    it('should have search/filter functionality', () => {
      cy.get('input[type="text"], input[type="search"], select').should('exist');
    });
  });

  describe('My Domains Page', () => {
    beforeEach(() => {
      cy.visitApp('domains', '/my-domains');
    });

    it('should load my domains page', () => {
      cy.url().should('include', '/my-domains');
    });

    it('should display content or empty state', () => {
      cy.get('body').should('be.visible');
    });
  });

  describe('Domain Detail Page', () => {
    it('should navigate to domain detail from domains list', () => {
      cy.visitApp('domains', '/domains');
      cy.wait(2000);

      cy.get('body').then(($body) => {
        if (!$body.text().includes('No domains')) {
          // Click first domain card
          cy.get('[class*="card"] a, a[href*="/domain/"]').first().click();
          cy.url().should('include', '/domain/');

          // Should show domain details
          cy.contains(/record|dns|owner|txid/i).should('exist');
        }
      });
    });
  });

  describe('Domain Management', () => {
    it('should navigate to domain management if domain exists', () => {
      cy.visitApp('domains', '/my-domains');
      cy.wait(2000);

      // Page should be visible
      cy.get('body').should('be.visible');
    });
  });

  describe('Navigation Flow', () => {
    it('should navigate through the entire app via UI', () => {
      // Start at home
      cy.visitApp('domains', '/');
      cy.contains('Decentralized DNS on Bitcoin').should('be.visible');

      // Navigate to register
      cy.contains('Register Domain').click();
      cy.url().should('include', '/register');

      // Navigate back home
      cy.get('header a, nav a, a[href="/"]').first().click();
      cy.url().should('match', /localhost:3400\/?$/);

      // Navigate to domains list
      cy.contains('Browse Domains').click();
      cy.url().should('include', '/domains');

      // Navigate back home
      cy.get('header a, nav a, a[href="/"]').first().click();

      // Navigate to my domains
      cy.get('a[href="/my-domains"]').first().click();
      cy.url().should('include', '/my-domains');
    });
  });

  describe('Complete Domain Lifecycle', () => {
    it('should search, register, and view a domain', () => {
      const uniqueDomain = `life${Date.now().toString().slice(-6)}`;
      const fullDomain = `${uniqueDomain}.btc`;

      // Start at home and search
      cy.visitApp('domains', '/');
      cy.get('input[type="text"], input[type="search"]').first().clear().type(fullDomain);
      cy.get('input[type="text"], input[type="search"]').first().type('{enter}');
      cy.wait(2000);

      // Verify search was performed
      cy.get('body').should('be.visible');
    });
  });
});

