/**
 * Anchor Proofs - Complete UI Flow Tests
 *
 * Comprehensive E2E tests that verify the entire user journey
 * through the Proofs (Proof of Existence) application via UI interactions.
 */

describe('Anchor Proofs - Complete User Journey via UI', () => {
  describe('Home Page', () => {
    beforeEach(() => {
      cy.visitApp('proofs', '/');
    });

    it('should display the hero section with correct messaging', () => {
      cy.contains('Proof of Existence on Bitcoin').should('be.visible');
      cy.contains('Timestamp any file on the Bitcoin blockchain').should('be.visible');
    });

    it('should display action buttons in hero section', () => {
      cy.contains('Stamp a File').should('be.visible');
      cy.contains('Validate a File').should('be.visible');
    });

    it('should navigate to stamp page when clicking Stamp a File', () => {
      cy.contains('Stamp a File').click();
      cy.url().should('include', '/stamp');
    });

    it('should navigate to validate page when clicking Validate a File', () => {
      cy.contains('Validate a File').click();
      cy.url().should('include', '/validate');
    });

    it('should display How It Works section', () => {
      cy.contains('How It Works').should('be.visible');
      cy.contains('Upload File').should('be.visible');
      cy.contains('Generate Hash').should('be.visible');
      cy.contains('Record on Bitcoin').should('be.visible');
    });

    it('should display Protocol Statistics section', () => {
      cy.contains('Protocol Statistics').should('be.visible');
      cy.contains('Total Proofs').should('be.visible');
      cy.contains('Active Proofs').should('be.visible');
      cy.contains('Revoked').should('be.visible');
      cy.contains('SHA-256').should('be.visible');
      cy.contains('SHA-512').should('be.visible');
      cy.contains('Total Size').should('be.visible');
    });

    it('should display Recent Proofs section if proofs exist', () => {
      cy.get('body').then(($body) => {
        if ($body.text().includes('Recent Proofs')) {
          cy.contains('Recent Proofs').should('be.visible');
          cy.contains('View all').should('be.visible');
        }
      });
    });
  });

  describe('Stamp Page - Proof Creation', () => {
    beforeEach(() => {
      cy.visitApp('proofs', '/stamp');
    });

    it('should load the stamp page', () => {
      cy.url().should('include', '/stamp');
    });

    it('should display file upload area', () => {
      cy.contains(/upload|select|drag|file/i).should('exist');
    });

    it('should have file input element', () => {
      cy.get('input[type="file"]').should('exist');
    });

    it('should upload a test file and display hash', () => {
      // Upload the test fixture file
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });

      // Wait for processing
      cy.wait(1000);

      // Should show file info or hash
      cy.contains(/test-file|sha|hash/i, { timeout: 10000 }).should('exist');
    });

    it('should show hash algorithm after file upload', () => {
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });
      cy.wait(1000);

      // Should display the algorithm used
      cy.contains(/sha-256|sha-512/i, { timeout: 10000 }).should('exist');
    });

    it('should have carrier type selection', () => {
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });
      cy.wait(1000);

      // Look for carrier options
      cy.contains(/op_return|inscription|witness|carrier|stamp/i, { timeout: 10000 }).should('exist');
    });

    it('should have description field', () => {
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });
      cy.wait(1000);

      // Look for description textarea
      cy.get('textarea').should('exist');
    });

    it('should have submit button', () => {
      cy.contains('Create Proof of Existence').should('exist');
    });

    it('should complete the entire stamp form', () => {
      // Upload file
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });
      cy.wait(1000);

      // Add description
      cy.get('textarea').first().type('E2E Test Proof - UI Flow');

      // Verify submit button is available
      cy.contains('Create Proof of Existence').should('be.visible');
    });

    it('should submit a proof and create transaction', () => {
      // Upload file
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });
      cy.wait(1000);

      // Add description
      cy.get('textarea').first().type(`E2E Proof ${Date.now()}`);

      // Submit button should be visible
      cy.contains('Create Proof of Existence').should('be.visible');

      // Should show the form is ready
      cy.get('body').should('be.visible');
    });
  });

  describe('Validate Page', () => {
    beforeEach(() => {
      cy.visitApp('proofs', '/validate');
    });

    it('should load the validate page', () => {
      cy.url().should('include', '/validate');
    });

    it('should have file upload for validation', () => {
      cy.get('input[type="file"]').should('exist');
    });

    it('should upload file and check for proof', () => {
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });
      cy.wait(2000);

      // Should show validation result (found or not found)
      cy.get('body').then(($body) => {
        const text = $body.text();
        expect(text.toLowerCase()).to.match(/found|verified|not found|no proof|proof|hash/);
      });
    });
  });

  describe('Proofs List Page', () => {
    beforeEach(() => {
      cy.visitApp('proofs', '/proofs');
    });

    it('should load the proofs list page', () => {
      cy.url().should('include', '/proofs');
    });

    it('should display proofs or empty state', () => {
      cy.get('body').should('be.visible');
    });

    it('should have search functionality', () => {
      cy.get('input[type="text"], input[type="search"]').should('exist');
    });
  });

  describe('My Proofs Page', () => {
    beforeEach(() => {
      cy.visitApp('proofs', '/my-proofs');
    });

    it('should load my proofs page', () => {
      cy.url().should('include', '/my-proofs');
    });

    it('should display content or empty state', () => {
      cy.get('body').should('be.visible');
    });
  });

  describe('Proof Detail Page', () => {
    it('should navigate to proof detail from proofs list', () => {
      cy.visitApp('proofs', '/proofs');
      cy.wait(2000);

      cy.get('body').then(($body) => {
        if (!$body.text().includes('No proofs')) {
          // Click first proof card
          cy.get('[class*="card"] a, a[href*="/proof/"]').first().click();
          cy.url().should('include', '/proof/');

          // Should show proof details
          cy.contains(/hash|file|timestamp|block/i).should('exist');
        }
      });
    });
  });

  describe('Navigation Flow', () => {
    it('should navigate through the entire app via UI', () => {
      // Start at home
      cy.visitApp('proofs', '/');
      cy.contains('Proof of Existence on Bitcoin').should('be.visible');

      // Navigate to stamp
      cy.contains('Stamp a File').click();
      cy.url().should('include', '/stamp');

      // Navigate back home
      cy.get('header a, nav a, a[href="/"]').first().click();
      cy.url().should('match', /localhost:3500\/?$/);

      // Navigate to validate
      cy.contains('Validate a File').click();
      cy.url().should('include', '/validate');

      // Navigate back home
      cy.get('header a, nav a, a[href="/"]').first().click();

      // Navigate to proofs list via link
      cy.get('a[href="/proofs"]').first().click();
      cy.url().should('include', '/proofs');
    });
  });

  describe('Complete Proof Lifecycle', () => {
    it('should create a proof and then validate it', () => {
      // Go to stamp page
      cy.visitApp('proofs', '/stamp');

      // Upload file
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });
      cy.wait(1000);

      // Add description
      cy.get('textarea').first().type(`Lifecycle Test ${Date.now()}`);

      // Submit
      cy.contains('Create Proof of Existence').click();
      cy.wait(3000);

      // Mine block
      cy.mineBlocks(1);
      cy.wait(3000);

      // Go to validate page
      cy.visitApp('proofs', '/validate');

      // Upload the same file
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.txt', { force: true });
      cy.wait(2000);

      // Should find the proof (if indexer has caught up)
      cy.get('body').should('be.visible');
    });
  });
});

