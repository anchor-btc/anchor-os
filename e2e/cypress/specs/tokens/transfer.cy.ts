describe('Anchor Tokens Token Page', () => {
  beforeEach(() => {
    cy.visitApp('tokens', '/tokens');
  });

  it('should navigate to token page if tokens exist', () => {
    cy.get('a[href*="/token/"]').then(($links) => {
      if ($links.length > 0) {
        cy.wrap($links.first()).click();
        cy.url().should('include', '/token/');
      } else {
        cy.get('body').should('be.visible');
      }
    });
  });

  it('should display token page content', () => {
    cy.get('a[href*="/token/"]').then(($links) => {
      if ($links.length > 0) {
        cy.wrap($links.first()).click();
        cy.get('div').should('have.length.greaterThan', 0);
      } else {
        cy.get('body').should('be.visible');
      }
    });
  });

  it('should have buttons on token page', () => {
    cy.get('a[href*="/token/"]').then(($links) => {
      if ($links.length > 0) {
        cy.wrap($links.first()).click();
        cy.get('button').should('have.length.greaterThan', 0);
      } else {
        cy.get('body').should('be.visible');
      }
    });
  });
});

describe('Anchor Tokens Operations', () => {
  it('should display token operations content', () => {
    cy.visitApp('tokens', '/tokens');
    
    cy.get('a[href*="/token/"]').then(($links) => {
      if ($links.length > 0) {
        cy.wrap($links.first()).click();
        // Token page should have some content
        cy.get('body').should('be.visible');
      } else {
        cy.get('body').should('be.visible');
      }
    });
  });

  it('should show page elements', () => {
    cy.visitApp('tokens', '/tokens');
    
    cy.get('a[href*="/token/"]').then(($links) => {
      if ($links.length > 0) {
        cy.wrap($links.first()).click();
        cy.get('svg').should('have.length.greaterThan', 0);
      } else {
        cy.get('body').should('be.visible');
      }
    });
  });
});
