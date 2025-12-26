describe('Anchor Domains Home', () => {
  beforeEach(() => {
    cy.visitApp('domains', '/');
  });

  it('should load the domains home page', () => {
    cy.url().should('include', 'localhost:3400');
    cy.get('body').should('be.visible');
  });

  it('should display the hero section', () => {
    // Check for hero/title section
    cy.contains(/dns|domain|bitcoin/i, { timeout: 15000 }).should('exist');
  });

  it('should display the search box', () => {
    // Check for domain search input
    cy.get('input[type="text"], input[type="search"]').should('exist');
  });

  it('should display protocol statistics', () => {
    // Look for stats section
    cy.contains(/domain|record|block/i, { timeout: 10000 }).should('exist');
  });

  it('should display supported TLDs', () => {
    // Check for TLD mentions
    cy.contains(/\.btc|\.sat|\.anchor/i, { timeout: 10000 }).should('exist');
  });

  it('should have navigation to register page', () => {
    // Check for register link/button
    cy.contains(/register/i).should('exist');
  });

  it('should have navigation to browse domains', () => {
    // Check for browse/domains link
    cy.contains(/browse|domains|view all/i).should('exist');
  });

  it('should display recent domains section', () => {
    // Look for recent domains
    cy.contains(/recent|latest/i, { timeout: 10000 }).should('exist');
  });
});

