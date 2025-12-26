describe('Dashboard Home', () => {
  beforeEach(() => {
    cy.visitApp('dashboard', '/');
  });

  it('should load the dashboard home page', () => {
    // Check page loads successfully
    cy.url().should('include', 'localhost:8000');
    
    // Check main elements are present
    cy.get('body').should('be.visible');
  });

  it('should display the sidebar navigation', () => {
    // Check sidebar is visible
    cy.get('[data-testid="sidebar"], nav, aside').first().should('be.visible');
  });

  it('should display Bitcoin node status widget', () => {
    // Look for Bitcoin-related status indicators
    cy.contains(/bitcoin|node|block/i, { timeout: 15000 }).should('exist');
  });

  it('should display wallet balance widget', () => {
    // Look for wallet/balance information
    cy.contains(/wallet|balance|btc|sats/i, { timeout: 15000 }).should('exist');
  });

  it('should have working navigation links', () => {
    // Check that main navigation links exist
    cy.get('a[href*="/wallet"], a[href*="/node"], a[href*="/services"]')
      .first()
      .should('exist');
  });

  it('should display services status', () => {
    // Look for services or containers status
    cy.contains(/services|containers|running/i, { timeout: 15000 }).should('exist');
  });
});

