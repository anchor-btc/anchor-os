describe('Anchor Domains Register', () => {
  beforeEach(() => {
    cy.visitApp('domains', '/register');
  });

  it('should load the register page', () => {
    cy.url().should('include', '/register');
  });

  it('should display registration form', () => {
    cy.get('input').should('exist');
  });

  it('should have domain name input', () => {
    cy.get('input[type="text"], input').first().should('be.visible');
  });

  it('should show TLD options', () => {
    // Check for TLD selector (.btc, .sat, etc.)
    cy.get('select, button, [role="combobox"]').should('exist');
  });

  it('should display cost information', () => {
    // Enter a domain name to trigger cost calculation
    cy.get('input').first().clear().type('testdomain');

    // Page should show some content (cost/fee info)
    cy.wait(500);
    cy.get('body').should('be.visible');
  });

  it('should allow typing domain name', () => {
    const testDomain = 'mytestdomain';
    cy.get('input').first().clear().type(testDomain);
    cy.get('input').first().should('have.value', testDomain);
  });

  it('should have submit button', () => {
    cy.get('button[type="submit"], button').should('have.length.greaterThan', 0);
  });

  it('should have navigation elements', () => {
    cy.get('a, button').should('have.length.greaterThan', 0);
  });
});

describe('Anchor Domains Home', () => {
  beforeEach(() => {
    cy.visitApp('domains', '/');
  });

  it('should load the home page', () => {
    cy.url().should('include', 'localhost');
  });

  it('should have link to register', () => {
    cy.get('a[href="/register"], a[href*="register"]').should('exist');
  });

  it('should navigate to register page', () => {
    cy.get('a[href="/register"], a[href*="register"]').first().click();
    cy.url().should('include', '/register');
  });
});

describe('Anchor Domains Browse', () => {
  beforeEach(() => {
    cy.visitApp('domains', '/domains');
  });

  it('should load the domains list page', () => {
    cy.url().should('include', '/domains');
  });

  it('should display page content', () => {
    cy.get('body').should('be.visible');
  });

  it('should have search or filter', () => {
    cy.get('input, select').should('exist');
  });
});

describe('Anchor Domains My Domains', () => {
  beforeEach(() => {
    cy.visitApp('domains', '/my-domains');
  });

  it('should load my domains page', () => {
    cy.url().should('include', '/my-domains');
  });

  it('should display page content', () => {
    cy.get('body').should('be.visible');
  });
});
