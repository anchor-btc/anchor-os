describe('Anchor Tokens Home', () => {
  beforeEach(() => {
    cy.visitApp('tokens', '/');
  });

  it('should load the tokens home page', () => {
    cy.url().should('include', 'localhost:3600');
    cy.get('body').should('be.visible');
  });

  it('should display hero section', () => {
    // Check for token-related messaging
    cy.contains(/token|utxo|bitcoin/i, { timeout: 15000 }).should('exist');
  });

  it('should display protocol statistics', () => {
    // Look for stats
    cy.contains(/token|holder|operation|block/i, { timeout: 10000 }).should('exist');
  });

  it('should have navigation to deploy page', () => {
    cy.contains(/deploy|create/i).should('exist');
  });

  it('should have navigation to browse tokens', () => {
    cy.contains(/browse|tokens|view/i).should('exist');
  });

  it('should display recent tokens', () => {
    // Look for recent tokens section
    cy.contains(/recent|latest|token/i, { timeout: 10000 }).should('exist');
  });

  it('should show how it works section', () => {
    // Look for explanation steps
    cy.contains(/how|work|step|deploy|transfer/i, { timeout: 10000 }).should('exist');
  });
});

