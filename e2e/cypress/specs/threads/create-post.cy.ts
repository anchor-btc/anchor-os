describe('Anchor Threads Compose Page', () => {
  beforeEach(() => {
    // The compose form is at /compose, not the home page
    cy.visitApp('threads', '/compose');
  });

  it('should load the compose page', () => {
    cy.url().should('include', '/compose');
  });

  it('should have message textarea', () => {
    // The textarea has a placeholder "Write your message here..."
    cy.get('textarea').should('exist');
  });

  it('should be able to type a message', () => {
    const testMessage = `E2E Test Message ${Date.now()}`;

    cy.get('textarea').clear().type(testMessage);
    cy.get('textarea').should('have.value', testMessage);
  });

  it('should have submit button', () => {
    // Button says "Send Message"
    cy.get('button[type="submit"]')
      .contains(/send message/i)
      .should('exist');
  });

  it('should display wallet balance', () => {
    // Check for wallet balance section
    cy.contains(/wallet balance|btc/i, { timeout: 10000 }).should('exist');
  });

  it('should have carrier selection', () => {
    // Check for carrier options (OP_RETURN, Inscription, Stamps)
    cy.contains(/op_return|inscription|stamp|carrier/i, { timeout: 10000 }).should('exist');
  });

  it('should have parent txid field for replies', () => {
    // Check for parent TXID input
    cy.contains(/parent txid/i).should('exist');
  });

  it('should create a new message (full flow)', () => {
    const testMessage = `E2E Test ${Date.now()}`;

    // Type message
    cy.get('textarea').clear().type(testMessage);

    // Submit
    cy.get('button[type="submit"]').click();

    // Wait for transaction (the app auto-mines a block)
    cy.wait(5000);

    // Should show success message
    cy.contains(/message created|success/i, { timeout: 20000 }).should('exist');
  });
});

describe('Anchor Threads Navigation', () => {
  it('should navigate from home to compose', () => {
    cy.visitApp('threads', '/');

    // Click on "Create Thread" link
    cy.contains(/create thread/i).click();

    // Should be on compose page
    cy.url().should('include', '/compose');
  });

  it('should have browse threads link', () => {
    cy.visitApp('threads', '/');

    // Check for Browse Threads link
    cy.contains(/browse threads|view all/i).should('exist');
  });
});

describe('Anchor Threads Message View', () => {
  it('should display message cards on home page', () => {
    cy.visitApp('threads', '/');

    // Check for message cards or empty state
    cy.contains(/thread|message|no threads yet/i, { timeout: 10000 }).should('exist');
  });

  it('should navigate to threads list', () => {
    cy.visitApp('threads', '/threads');

    cy.url().should('include', '/threads');
    cy.contains(/thread|message|no threads/i, { timeout: 10000 }).should('exist');
  });
});
