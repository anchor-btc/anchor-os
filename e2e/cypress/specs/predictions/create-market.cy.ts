describe('Anchor Predictions Create Market Page', () => {
  beforeEach(() => {
    cy.visitApp('predictions', '/create');
  });

  it('should load the create market page', () => {
    cy.url().should('include', '/create');
  });

  it('should display form elements', () => {
    cy.get('input, select, textarea, button').should('exist');
  });

  it('should have input fields', () => {
    cy.get('input').should('have.length.greaterThan', 0);
  });

  it('should have buttons', () => {
    cy.get('button').should('have.length.greaterThan', 0);
  });

  it('should display page content', () => {
    cy.get('body').should('be.visible');
  });
});

describe('Anchor Predictions Home Navigation', () => {
  beforeEach(() => {
    cy.visitApp('predictions', '/');
  });

  it('should load the home page', () => {
    cy.url().should('include', 'localhost');
  });

  it('should have navigation links', () => {
    cy.get('a').should('have.length.greaterThan', 0);
  });

  it('should have link to create', () => {
    cy.get('a[href="/create"], a[href*="create"]').should('exist');
  });

  it('should navigate to create page', () => {
    cy.get('a[href="/create"], a[href*="create"]').first().click();
    cy.url().should('include', '/create');
  });
});

describe('Anchor Predictions Markets List', () => {
  beforeEach(() => {
    cy.visitApp('predictions', '/markets');
  });

  it('should load the markets list page', () => {
    cy.url().should('include', '/markets');
  });

  it('should display page content', () => {
    cy.get('body').should('be.visible');
  });

  it('should have page elements', () => {
    cy.get('div').should('have.length.greaterThan', 0);
  });
});
