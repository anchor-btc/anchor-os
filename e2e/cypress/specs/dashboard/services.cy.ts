describe('Dashboard Services', () => {
  beforeEach(() => {
    cy.visitApp('dashboard', '/services');
  });

  it('should load the services page', () => {
    cy.url().should('include', '/services');
  });

  it('should display list of Docker services', () => {
    // Check for service cards or list items
    cy.get('body').should('be.visible');
    cy.contains(/service|container|docker/i, { timeout: 15000 }).should('exist');
  });

  it('should show service status indicators', () => {
    // Look for status indicators (running, stopped, etc.)
    cy.contains(/running|stopped|healthy|status/i, { timeout: 10000 }).should('exist');
  });

  it('should display core Bitcoin service', () => {
    // Check for Bitcoin Core service
    cy.contains(/bitcoin|core-bitcoin/i, { timeout: 10000 }).should('exist');
  });

  it('should display wallet service', () => {
    // Check for wallet service
    cy.contains(/wallet|core-wallet/i, { timeout: 10000 }).should('exist');
  });

  it('should display indexer service', () => {
    // Check for indexer service
    cy.contains(/indexer|core-indexer/i, { timeout: 10000 }).should('exist');
  });

  it('should have service action buttons', () => {
    // Look for start/stop/restart buttons
    cy.get('button').should('have.length.greaterThan', 0);
  });
});

