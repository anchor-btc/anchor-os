describe('Anchor Places Home', () => {
  beforeEach(() => {
    cy.visitApp('places', '/');
  });

  it('should load the places home page', () => {
    cy.url().should('include', 'localhost:3300');
    cy.get('body').should('be.visible');
  });

  it('should display the map', () => {
    // Check for map component
    cy.get('[data-map], .map, .leaflet-container, #map').should('exist');
  });

  it('should display protocol statistics', () => {
    // Look for stats
    cy.contains(/marker|place|location|block/i, { timeout: 15000 }).should('exist');
  });

  it('should have create marker option', () => {
    // Look for create marker button
    cy.contains(/create|add|new|marker|pin/i).should('exist');
  });

  it('should have search functionality', () => {
    // Look for search input
    cy.get('input[type="text"], input[type="search"]').should('exist');
  });
});

