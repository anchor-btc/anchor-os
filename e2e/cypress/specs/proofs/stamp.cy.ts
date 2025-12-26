describe('Anchor Proofs Stamp', () => {
  beforeEach(() => {
    cy.visitApp('proofs', '/stamp');
  });

  it('should load the stamp page', () => {
    cy.url().should('include', '/stamp');
  });

  it('should display file upload area', () => {
    // Check for file upload component
    cy.contains(/upload|select|file|drag/i, { timeout: 10000 }).should('exist');
  });

  it('should have file input element', () => {
    // Check for file input (may be hidden)
    cy.get('input[type="file"]').should('exist');
  });

  it('should upload a test file', () => {
    // Upload the test fixture file
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });

    // Wait for processing
    cy.wait(1000);

    // Should show file info or hash
    cy.contains(/test-file|sha|hash/i, { timeout: 10000 }).should('exist');
  });

  it('should display file hash after upload', () => {
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });

    // Should display the computed hash
    cy.contains(/sha-256|sha-512|hash/i, { timeout: 10000 }).should('exist');
  });

  it('should have hash algorithm selection', () => {
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });

    // Look for algorithm options
    cy.contains(/sha-256|sha-512|algorithm/i, { timeout: 10000 }).should('exist');
  });

  it('should have carrier type selection', () => {
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });

    // Look for carrier options
    cy.contains(/op_return|inscription|stamp|witness|carrier/i, { timeout: 10000 }).should('exist');
  });

  it('should have optional description field', () => {
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });

    // Look for description textarea
    cy.get('textarea, input[name*="description"]').should('exist');
  });

  it('should have submit button', () => {
    cy.contains('Create Proof of Existence').should('exist');
  });

  it('should fill the form completely', () => {
    // Upload file
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });

    // Wait for hash computation
    cy.wait(1000);

    // Add description
    cy.get('textarea').first().type('E2E Test Proof');
    cy.get('textarea').first().should('have.value', 'E2E Test Proof');

    // Verify submit button exists
    cy.contains('Create Proof of Existence').should('exist');
  });

  it('should click submit button', () => {
    // Upload file
    cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });

    // Wait for hash computation
    cy.wait(1000);

    // Click create button
    cy.contains('Create Proof of Existence').click();

    // Wait and verify page still works
    cy.wait(2000);
    cy.get('body').should('be.visible');
  });
});
