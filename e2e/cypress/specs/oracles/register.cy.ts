describe('Anchor Oracles Register Page', () => {
  beforeEach(() => {
    cy.visitApp('oracles', '/register');
  });

  it('should load the register page', () => {
    cy.url().should('include', '/register');
  });

  it('should display registration form', () => {
    cy.get('input, textarea').should('exist');
  });

  it('should have oracle name input', () => {
    cy.get('input[type="text"]').first().should('be.visible');
  });

  it('should have category options', () => {
    // Categories are displayed as clickable buttons/cards
    cy.get('button, [role="checkbox"], input[type="checkbox"]').should('have.length.greaterThan', 0);
  });

  it('should have description field', () => {
    cy.get('textarea').should('exist');
  });

  it('should display stake amount input', () => {
    // Stake input field
    cy.get('input[type="number"], input').should('have.length.greaterThan', 0);
  });

  it('should have submit button', () => {
    cy.get('button[type="submit"], button').contains(/register|registrar/i).should('exist');
  });

  it('should allow typing oracle name', () => {
    const testName = `TestOracle${Date.now()}`;
    cy.get('input[type="text"]').first().clear().type(testName);
    cy.get('input[type="text"]').first().should('have.value', testName);
  });

  it('should allow typing description', () => {
    cy.get('textarea').first().clear().type('Test description');
    cy.get('textarea').first().should('have.value', 'Test description');
  });
});

describe('Anchor Oracles Home Navigation', () => {
  beforeEach(() => {
    cy.visitApp('oracles', '/');
  });

  it('should have link to register page', () => {
    cy.get('a[href="/register"], a[href*="register"]').should('exist');
  });

  it('should navigate to register page', () => {
    cy.get('a[href="/register"], a[href*="register"]').first().click();
    cy.url().should('include', '/register');
  });
});

describe('Anchor Oracles Browse', () => {
  beforeEach(() => {
    cy.visitApp('oracles', '/oracles');
  });

  it('should load the oracles list page', () => {
    cy.url().should('include', '/oracles');
  });

  it('should display page content', () => {
    cy.get('body').should('be.visible');
  });

  it('should have search input or filter', () => {
    // Look for search input or select
    cy.get('input, select').should('exist');
  });
});

describe('Anchor Oracles My Oracles', () => {
  beforeEach(() => {
    cy.visitApp('oracles', '/my-oracles');
  });

  it('should load my oracles page', () => {
    cy.url().should('include', '/my-oracles');
  });

  it('should display page content', () => {
    cy.get('body').should('be.visible');
  });
});
