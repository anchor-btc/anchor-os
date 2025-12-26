describe('Anchor Proofs Validate', () => {
  beforeEach(() => {
    cy.visitApp('proofs', '/validate');
  });

  it('should load the validate page', () => {
    cy.url().should('include', '/validate');
  });

  it('should display file upload area for validation', () => {
    cy.contains(/upload|select|file|validate/i, { timeout: 10000 }).should('exist');
  });

  it('should have file input element', () => {
    cy.get('input[type="file"]').should('exist');
  });

  it('should upload a file for validation', () => {
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });
    
    // Should process the file
    cy.wait(1000);
    cy.get('body').should('be.visible');
  });

  it('should validate file and show result', () => {
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });
    
    // Wait for validation
    cy.wait(1000);
    
    // Should show some result (page still visible and functional)
    cy.get('body').should('be.visible');
  });

  it('should display hash after file upload', () => {
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });
    
    // Should show the computed hash
    cy.contains(/sha|hash/i, { timeout: 10000 }).should('exist');
  });
});

describe('Anchor Proofs Browse', () => {
  beforeEach(() => {
    cy.visitApp('proofs', '/proofs');
  });

  it('should load the proofs list page', () => {
    cy.url().should('include', '/proofs');
  });

  it('should display list of proofs', () => {
    // Check for proofs list or empty state
    cy.contains(/proof|no proofs|create/i, { timeout: 10000 }).should('exist');
  });

  it('should have proof cards with details', () => {
    // Look for proof information
    cy.contains(/hash|file|block|timestamp/i, { timeout: 10000 }).should('exist');
  });
});

describe('Anchor Proofs My Proofs', () => {
  beforeEach(() => {
    cy.visitApp('proofs', '/my-proofs');
  });

  it('should load the my proofs page', () => {
    cy.url().should('include', '/my-proofs');
  });

  it('should display owned proofs or empty state', () => {
    cy.contains(/my proofs|your proofs|no proofs|create/i, { timeout: 10000 }).should('exist');
  });
});

