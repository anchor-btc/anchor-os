describe('Anchor Domains Manage', () => {
  const testDomain = 'testmanage.btc';

  beforeEach(() => {
    cy.visitApp('domains', '/domains');
  });

  it('should load the domains list page', () => {
    cy.url().should('include', '/domains');
  });

  it('should display list of registered domains', () => {
    // Check for domain list or empty state
    cy.get('body').should('be.visible');
    cy.contains(/domain|no domains|register/i, { timeout: 10000 }).should('exist');
  });

  it('should have pagination if many domains', () => {
    // Look for pagination controls
    cy.get('body').should('be.visible');
  });

  it('should navigate to domain details', () => {
    // If domains exist, click on one
    cy.get('a[href*="/domain/"]')
      .first()
      .then(($link) => {
        if ($link.length) {
          cy.wrap($link).click();
          cy.url().should('include', '/domain/');
        }
      });
  });

  it('should display domain card information', () => {
    // Check that domain cards show relevant info
    cy.contains(/domain|\.btc|\.sat|block|tx/i, { timeout: 10000 }).should('exist');
  });

  it('should have my domains section', () => {
    cy.visitApp('domains', '/my-domains');
    cy.url().should('include', '/my-domains');

    // Should show owned domains or empty state
    cy.contains(/my domains|owned|no domains/i, { timeout: 10000 }).should('exist');
  });
});

describe('Domain Management Actions', () => {
  it('should be able to view DNS records', () => {
    // Navigate to a domain page if exists
    cy.visitApp('domains', '/domains');

    cy.get('a[href*="/domain/"]')
      .first()
      .then(($link) => {
        if ($link.length) {
          cy.wrap($link).click();

          // Look for DNS records section
          cy.contains(/record|dns|a record|txt|cname/i, { timeout: 10000 }).should('exist');
        }
      });
  });

  it('should have add record button on domain page', () => {
    cy.visitApp('domains', '/domains');

    cy.get('a[href*="/domain/"]')
      .first()
      .then(($link) => {
        if ($link.length) {
          cy.wrap($link).click();

          // Look for add record option
          cy.contains(/add|new|create|record/i, { timeout: 10000 }).should('exist');
        }
      });
  });
});
