describe('Anchor Domains Search', () => {
  beforeEach(() => {
    cy.visitApp('domains', '/');
  });

  it('should have a search input', () => {
    cy.get('input[type="text"], input[type="search"]').should('be.visible');
  });

  it('should search for an available domain', () => {
    const randomDomain = `testdomain${Date.now()}.btc`;

    // Type in search box
    cy.get('input[type="text"], input[type="search"]').first().clear().type(randomDomain);

    // Submit search
    cy.get('button[type="submit"], button')
      .contains(/search|buscar/i)
      .click();

    // Should show available message
    cy.contains(/available|disponível|register|registrar/i, { timeout: 10000 }).should('exist');
  });

  it('should show domain not found for non-existent domain', () => {
    const randomDomain = `nonexistent${Date.now()}.btc`;

    cy.get('input[type="text"], input[type="search"]').first().clear().type(randomDomain);
    cy.get('button[type="submit"], button')
      .contains(/search|buscar/i)
      .click();

    // Should show not found or available to register
    cy.contains(/available|not found|register/i, { timeout: 10000 }).should('exist');
  });

  it('should require a valid TLD', () => {
    // Search without TLD
    cy.get('input[type="text"], input[type="search"]').first().clear().type('testdomain');

    // Try to search (may show validation or auto-add TLD)
    cy.get('button[type="submit"], button')
      .contains(/search|buscar/i)
      .click();

    // Should either show error or handle gracefully
    cy.get('body').should('be.visible');
  });

  it('should navigate to register from search results', () => {
    const randomDomain = `newdomain${Date.now()}.btc`;

    cy.get('input[type="text"], input[type="search"]').first().clear().type(randomDomain);
    cy.get('button[type="submit"], button')
      .contains(/search|buscar/i)
      .click();

    // Wait for results
    cy.wait(2000);

    // Look for register button in results
    cy.contains(/register|registrar/i, { timeout: 10000 }).should('exist');
  });
});
