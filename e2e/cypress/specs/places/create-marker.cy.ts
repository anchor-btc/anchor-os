describe('Anchor Places Home', () => {
  beforeEach(() => {
    cy.visitApp('places', '/');
  });

  it('should load the home page', () => {
    cy.url().should('include', 'localhost');
  });

  it('should display page content', () => {
    cy.get('body').should('be.visible');
  });

  it('should have map container', () => {
    cy.get('.leaflet-container').should('exist');
  });

  it('should have search input', () => {
    cy.get('input').should('exist');
  });

  it('should have buttons', () => {
    cy.get('button').should('have.length.greaterThan', 0);
  });
});

describe('Anchor Places Create Marker', () => {
  beforeEach(() => {
    cy.visitApp('places', '/');
    // Wait for map to load
    cy.get('.leaflet-container', { timeout: 10000 }).should('be.visible');
  });

  it('should open create marker dialog on double click', () => {
    // Double click on map to open dialog
    cy.get('.leaflet-container').dblclick(400, 300, { force: true });

    // Dialog should appear with "New Marker" title
    cy.contains('New Marker', { timeout: 5000 }).should('be.visible');
  });

  it('should display category selection in dialog', () => {
    cy.get('.leaflet-container').dblclick(400, 300, { force: true });

    // Should show Category label
    cy.contains('Category').should('be.visible');

    // Should have category buttons (General, Photo, Commerce, etc.)
    cy.get('button').should('have.length.greaterThan', 3);
  });

  it('should display message textarea in dialog', () => {
    cy.get('.leaflet-container').dblclick(400, 300, { force: true });

    // Should show Message label
    cy.contains('Message').should('be.visible');

    // Should have textarea with placeholder
    cy.get('textarea[placeholder="Write your message..."]').should('be.visible');
  });

  it('should display carrier selection in dialog', () => {
    cy.get('.leaflet-container').dblclick(400, 300, { force: true });

    // Should show Carrier label
    cy.contains('Carrier').should('be.visible');
  });

  it('should have submit button in dialog', () => {
    cy.get('.leaflet-container').dblclick(400, 300, { force: true });

    // Should have "Pin on Bitcoin" button
    cy.contains('Pin on Bitcoin').should('be.visible');
  });

  it('should be able to type message in dialog', () => {
    const testMessage = 'Test message for marker';

    cy.get('.leaflet-container').dblclick(400, 300, { force: true });

    cy.contains('New Marker').should('be.visible');

    // Type in textarea
    cy.get('textarea[placeholder="Write your message..."]').clear().type(testMessage);
    cy.get('textarea[placeholder="Write your message..."]').should('have.value', testMessage);
  });

  it('should create a marker (full flow)', () => {
    const testMessage = `E2E Test ${Date.now()}`;

    // Double click on map to open dialog
    cy.get('.leaflet-container').dblclick(400, 300, { force: true });

    // Wait for dialog
    cy.contains('New Marker', { timeout: 5000 }).should('be.visible');

    // Select a category (click second category button - Photo)
    cy.get('.grid.grid-cols-3 button').eq(1).click();

    // Type message
    cy.get('textarea[placeholder="Write your message..."]').clear().type(testMessage);

    // Submit (click "Pin on Bitcoin")
    cy.contains('Pin on Bitcoin').click();

    // Should show broadcasting state
    cy.contains('Broadcasting', { timeout: 10000 }).should('exist');

    // Wait for pending marker or confirming state
    cy.contains(/Pending|Confirming|confirmed/i, { timeout: 30000 }).should('exist');
  });
});

describe('Anchor Places Elements', () => {
  beforeEach(() => {
    cy.visitApp('places', '/');
  });

  it('should have svg icons', () => {
    cy.get('svg').should('have.length.greaterThan', 0);
  });

  it('should render page fully', () => {
    cy.wait(1000);
    cy.get('body').should('be.visible');
  });
});
