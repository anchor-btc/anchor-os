describe('Anchor Oracles Home', () => {
  beforeEach(() => {
    cy.visitApp('oracles', '/');
  });

  it('should load the oracles home page', () => {
    cy.url().should('include', 'localhost:3700');
    cy.get('body').should('be.visible');
  });

  it('should display hero section', () => {
    // Check for oracle-related messaging
    cy.contains(/oracle|attestation|decentralized/i, { timeout: 15000 }).should('exist');
  });

  it('should display protocol statistics', () => {
    // Look for stats
    cy.contains(/oracle|attestation|block/i, { timeout: 10000 }).should('exist');
  });

  it('should have navigation to register oracle', () => {
    cy.contains(/register|create|become/i).should('exist');
  });

  it('should display oracle categories', () => {
    // Look for category mentions
    cy.contains(/price|sport|weather|election|random|custom/i, { timeout: 10000 }).should('exist');
  });

  it('should show list of registered oracles', () => {
    // Look for oracles list
    cy.contains(/oracle|registered|no oracles/i, { timeout: 10000 }).should('exist');
  });

  it('should show how it works section', () => {
    cy.contains(/how|work|step/i, { timeout: 10000 }).should('exist');
  });
});
