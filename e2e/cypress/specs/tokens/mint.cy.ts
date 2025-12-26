describe('Anchor Tokens List', () => {
  beforeEach(() => {
    cy.visitApp('tokens', '/tokens');
  });

  it('should load the tokens list page', () => {
    cy.url().should('include', '/tokens');
  });

  it('should display page content', () => {
    cy.get('body').should('be.visible');
  });

  it('should have navigation elements', () => {
    cy.get('a, button').should('have.length.greaterThan', 0);
  });

  it('should have page structure', () => {
    cy.get('div').should('have.length.greaterThan', 0);
  });
});

describe('Anchor Tokens Token Detail', () => {
  it('should navigate to token details if tokens exist', () => {
    cy.visitApp('tokens', '/tokens');
    
    // Click on a token if available
    cy.get('a[href*="/token/"]').then(($links) => {
      if ($links.length > 0) {
        cy.wrap($links.first()).click();
        cy.url().should('include', '/token/');
        cy.get('body').should('be.visible');
      } else {
        // No tokens exist, just verify page loads
        cy.get('body').should('be.visible');
      }
    });
  });

  it('should show token page content', () => {
    cy.visitApp('tokens', '/tokens');
    
    cy.get('a[href*="/token/"]').then(($links) => {
      if ($links.length > 0) {
        cy.wrap($links.first()).click();
        
        // Token detail page should have content
        cy.get('div').should('have.length.greaterThan', 0);
      } else {
        cy.get('body').should('be.visible');
      }
    });
  });
});

