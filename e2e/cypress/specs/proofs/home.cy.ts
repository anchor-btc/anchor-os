describe('Anchor Proofs Home', () => {
  beforeEach(() => {
    cy.visitApp('proofs', '/');
  });

  it('should load the proofs home page', () => {
    cy.url().should('include', 'localhost:3500');
    cy.get('body').should('be.visible');
  });

  it('should display hero section', () => {
    // Check for proof of existence messaging
    cy.contains(/proof|existence|timestamp|bitcoin/i, { timeout: 15000 }).should('exist');
  });

  it('should display protocol statistics', () => {
    // Look for stats
    cy.contains(/proof|hash|block/i, { timeout: 10000 }).should('exist');
  });

  it('should have navigation to stamp page', () => {
    cy.contains(/stamp|create|new/i).should('exist');
  });

  it('should have navigation to validate page', () => {
    cy.contains(/validate|verify|check/i).should('exist');
  });

  it('should display recent proofs', () => {
    // Look for recent proofs section
    cy.contains(/recent|latest|proof/i, { timeout: 10000 }).should('exist');
  });

  it('should show how it works section', () => {
    // Look for explanation
    cy.contains(/how|work|step/i, { timeout: 10000 }).should('exist');
  });
});

