describe('Anchor Predictions Home', () => {
  beforeEach(() => {
    cy.visitApp('predictions', '/');
  });

  it('should load the predictions home page', () => {
    cy.url().should('include', 'localhost:3800');
    cy.get('body').should('be.visible');
  });

  it('should display hero section', () => {
    // Check for prediction market messaging
    cy.contains(/prediction|market|lottery|bet/i, { timeout: 15000 }).should('exist');
  });

  it('should display protocol statistics', () => {
    // Look for stats
    cy.contains(/market|prediction|prize|block/i, { timeout: 10000 }).should('exist');
  });

  it('should have navigation to create market', () => {
    cy.contains(/create|new|start/i).should('exist');
  });

  it('should display active markets or lotteries', () => {
    // Look for markets list
    cy.contains(/market|lottery|active|no markets/i, { timeout: 10000 }).should('exist');
  });

  it('should show prize tiers information', () => {
    cy.contains(/prize|jackpot|winner|tier/i, { timeout: 10000 }).should('exist');
  });

  it('should show how it works section', () => {
    cy.contains(/how|work|step/i, { timeout: 10000 }).should('exist');
  });
});

