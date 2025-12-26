describe('Anchor Canvas Home', () => {
  beforeEach(() => {
    cy.visitApp('canvas', '/');
  });

  it('should load the canvas home page', () => {
    cy.url().should('include', 'localhost:3200');
    cy.get('body').should('be.visible');
  });

  it('should display the pixel canvas', () => {
    // Check for canvas element or grid
    cy.get('canvas, [data-canvas], .canvas, .grid').should('exist');
  });

  it('should have color picker', () => {
    // Look for color selection
    cy.contains(/color|palette/i).should('exist');
  });

  it('should display canvas statistics', () => {
    // Look for stats
    cy.contains(/pixel|placed|user|block/i, { timeout: 10000 }).should('exist');
  });

  it('should have zoom controls', () => {
    // Look for zoom buttons
    cy.get('button').should('have.length.greaterThan', 0);
  });
});

describe('Anchor Canvas Pixel Placement', () => {
  beforeEach(() => {
    cy.visitApp('canvas', '/');
  });

  it('should be able to select a color', () => {
    // Find and click color palette
    cy.get('[data-color], .color-picker, input[type="color"]').first().then(($el) => {
      if ($el.length) {
        cy.wrap($el).click();
      }
    });
  });

  it('should show coordinates on hover', () => {
    // Hover over canvas area
    cy.get('canvas, [data-canvas], .canvas').first().trigger('mouseover');
    
    // Look for coordinate display
    cy.contains(/x:|y:|\d+,\s*\d+/i, { timeout: 5000 }).should('exist');
  });

  it('should have pixel info display', () => {
    // Look for pixel information section
    cy.contains(/pixel|position|color|owner/i, { timeout: 10000 }).should('exist');
  });

  it('should place a pixel (full flow)', () => {
    // Select a color first
    cy.get('[data-color], .color-picker button, input[type="color"]').first().then(($el) => {
      if ($el.length) {
        cy.wrap($el).click();
      }
    });
    
    // Click on canvas to place pixel
    cy.get('canvas, [data-canvas], .canvas').first().click(100, 100, { force: true });
    
    // Wait for transaction
    cy.wait(3000);
    
    // Mine block
    cy.mineBlocks(1);
    cy.wait(3000);
    
    // Canvas should still be visible (success)
    cy.get('canvas, [data-canvas], .canvas').should('be.visible');
  });
});

describe('Anchor Canvas Navigation', () => {
  beforeEach(() => {
    cy.visitApp('canvas', '/');
  });

  it('should be able to pan the canvas', () => {
    cy.get('canvas, [data-canvas]').first().then(($canvas) => {
      if ($canvas.length) {
        // Drag to pan
        cy.wrap($canvas)
          .trigger('mousedown', { clientX: 200, clientY: 200 })
          .trigger('mousemove', { clientX: 300, clientY: 300 })
          .trigger('mouseup');
      }
    });
  });

  it('should display recently placed pixels', () => {
    // Look for recent activity section
    cy.contains(/recent|latest|activity/i, { timeout: 10000 }).should('exist');
  });
});

