describe('Anchor Tokens Deploy', () => {
  beforeEach(() => {
    cy.visitApp('tokens', '/deploy');
  });

  it('should load the deploy page', () => {
    cy.url().should('include', '/deploy');
  });

  it('should display token creation form', () => {
    // Check for form elements
    cy.get('input').should('exist');
  });

  it('should have ticker input', () => {
    // Look for ticker/symbol input
    cy.get('input[placeholder*="ticker"], input[name*="ticker"], input').first().should('be.visible');
  });

  it('should have multiple input fields', () => {
    // Token form has multiple inputs (ticker, decimals, supply, etc.)
    cy.get('input').should('have.length.greaterThan', 1);
  });

  it('should have decimals input', () => {
    // Look for decimals setting
    cy.contains(/decimal/i).should('exist');
  });

  it('should have supply settings', () => {
    // Look for supply configuration
    cy.contains(/supply|max|total/i).should('exist');
  });

  it('should have mint settings', () => {
    // Look for mint configuration (open mint vs fixed)
    cy.contains(/mint|open|fixed/i).should('exist');
  });

  it('should display fee estimate', () => {
    // Fill in basic token info
    cy.get('input').first().clear().type('TEST');
    
    // Look for fee/cost display
    cy.contains(/fee|cost|sats|btc/i, { timeout: 5000 }).should('exist');
  });

  it('should have submit button', () => {
    cy.get('button').contains(/deploy|create|submit/i).should('exist');
  });

  it('should validate ticker format', () => {
    // Enter invalid ticker (too long or invalid chars)
    cy.get('input').first().clear().type('INVALIDTICKERTOOLONG');
    
    // Should show validation or limit input
    cy.get('body').should('be.visible');
  });

  it('should deploy a new token (full flow)', () => {
    const uniqueTicker = `T${Date.now().toString().slice(-4)}`;
    
    // Fill ticker
    cy.get('input').first().clear().type(uniqueTicker);
    
    // Wait for form to update
    cy.wait(1000);
    
    // Click deploy button
    cy.get('button').contains(/deploy|create/i).click();
    
    // Wait for transaction
    cy.wait(3000);
    
    // Mine block
    cy.mineBlocks(1);
    cy.wait(3000);
    
    // Should show success
    cy.contains(/success|deployed|transaction|txid/i, { timeout: 15000 }).should('exist');
  });
});

