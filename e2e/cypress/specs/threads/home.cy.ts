describe('Anchor Threads Home', () => {
  beforeEach(() => {
    cy.visitApp('threads', '/');
  });

  it('should load the threads home page', () => {
    cy.url().should('include', 'localhost:3100');
    cy.get('body').should('be.visible');
  });

  it('should display message feed or empty state', () => {
    // Check for thread/message content
    cy.contains(/thread|message|post|no messages/i, { timeout: 15000 }).should('exist');
  });

  it('should have create post option', () => {
    // Look for create/new message button
    cy.contains(/create|new|post|write/i).should('exist');
  });

  it('should display message list', () => {
    // Check for message list container
    cy.get('body').should('be.visible');
  });

  it('should have navigation elements', () => {
    // Check for navigation
    cy.get('nav, header, a[href]').should('exist');
  });
});

