describe('Dashboard Settings', () => {
  beforeEach(() => {
    cy.visitApp('dashboard', '/settings');
  });

  it('should load the settings page', () => {
    cy.url().should('include', '/settings');
  });

  it('should display settings cards', () => {
    // Settings page has multiple link cards
    cy.get('a[href*="/settings/"]').should('have.length.greaterThan', 3);
  });

  it('should have profile settings link', () => {
    cy.get('a[href="/settings/profile"]').should('exist');
  });

  it('should have appearance settings link', () => {
    cy.get('a[href="/settings/appearance"]').should('exist');
  });

  it('should have language settings link', () => {
    cy.get('a[href="/settings/language"]').should('exist');
  });

  it('should have network settings link', () => {
    cy.get('a[href="/settings/network"]').should('exist');
  });

  it('should have security settings link', () => {
    cy.get('a[href="/settings/security"]').should('exist');
  });

  it('should have notifications settings link', () => {
    cy.get('a[href="/settings/notifications"]').should('exist');
  });

  it('should have dashboard settings link', () => {
    cy.get('a[href="/settings/dashboard"]').should('exist');
  });

  it('should have data settings link', () => {
    cy.get('a[href="/settings/data"]').should('exist');
  });
});

describe('Dashboard Settings Navigation', () => {
  it('should navigate to appearance settings', () => {
    cy.visitApp('dashboard', '/settings');
    cy.get('a[href="/settings/appearance"]').first().click();
    cy.url().should('include', '/settings/appearance');
  });

  it('should navigate to language settings', () => {
    cy.visitApp('dashboard', '/settings');
    cy.get('a[href="/settings/language"]').first().click();
    cy.url().should('include', '/settings/language');
  });

  it('should navigate to network settings', () => {
    cy.visitApp('dashboard', '/settings');
    cy.get('a[href="/settings/network"]').first().click();
    cy.url().should('include', '/settings/network');
  });

  it('should navigate to security settings', () => {
    cy.visitApp('dashboard', '/settings');
    cy.get('a[href="/settings/security"]').first().click();
    cy.url().should('include', '/settings/security');
  });
});

describe('Dashboard Appearance Settings', () => {
  beforeEach(() => {
    cy.visitApp('dashboard', '/settings/appearance');
  });

  it('should load appearance settings page', () => {
    cy.url().should('include', '/settings/appearance');
  });

  it('should have theme options', () => {
    // Look for clickable theme elements
    cy.get('button, [role="button"], .cursor-pointer').should('have.length.greaterThan', 0);
  });
});

describe('Dashboard Language Settings', () => {
  beforeEach(() => {
    cy.visitApp('dashboard', '/settings/language');
  });

  it('should load language settings page', () => {
    cy.url().should('include', '/settings/language');
  });

  it('should have language options', () => {
    // Look for language buttons/options (English, Português, Español)
    cy.get('button, [role="button"]').should('have.length.greaterThan', 0);
  });
});

describe('Dashboard Security Settings', () => {
  beforeEach(() => {
    cy.visitApp('dashboard', '/settings/security');
  });

  it('should load security settings page', () => {
    cy.url().should('include', '/settings/security');
  });

  it('should have security options', () => {
    // Look for toggle or input elements
    cy.get('button, input, [role="switch"]').should('exist');
  });
});
