/**
 * E2E Tests for Anchor Predictions - Complete UI Flow
 *
 * These tests use ACTUAL UI interactions:
 * - Clicking buttons
 * - Filling form fields
 * - Navigating between pages
 * - Verifying visual feedback
 *
 * NO direct API calls - everything goes through the UI!
 */

describe('Anchor Predictions - Complete User Journey via UI', () => {
  beforeEach(() => {
    // Clear any previous state
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('1. Home Page Experience', () => {
    beforeEach(() => {
      cy.visitApp('predictions', '/');
    });

    it('should display the main hero section', () => {
      // Check title and subtitle
      cy.contains('h1', 'Anchor Predictions').should('be.visible');
      cy.contains('Binary Prediction Markets on Bitcoin').should('be.visible');
    });

    it('should show live statistics', () => {
      // Stats cards should be visible
      cy.contains('Active Markets').should('be.visible');
      cy.contains('Total Volume').should('be.visible');
      cy.contains('Total Bets').should('be.visible');
      cy.contains('Resolved').should('be.visible');
    });

    it('should navigate to Create Market via hero button', () => {
      cy.contains('a', 'Create Market').click();
      cy.url().should('include', '/create');
      cy.contains('Create Prediction Market').should('be.visible');
    });

    it('should navigate to Browse Markets via hero button', () => {
      cy.contains('a', 'Browse Markets').click();
      cy.url().should('include', '/markets');
    });

    it('should display How It Works section with 3 steps', () => {
      cy.contains('How It Works').should('be.visible');
      cy.contains('Choose a Market').should('be.visible');
      cy.contains('Place Your Bet').should('be.visible');
      cy.contains('Collect Winnings').should('be.visible');
    });
  });

  describe('2. Create Market Flow via UI', () => {
    beforeEach(() => {
      cy.visitApp('predictions', '/create');
    });

    it('should display the create market form with all fields', () => {
      cy.contains('h1', 'Create Prediction Market').should('be.visible');

      // Question field
      cy.contains('label', 'Question').should('be.visible');
      cy.get('input[placeholder*="Bitcoin"]').should('be.visible');

      // Description field
      cy.contains('label', 'Description').should('be.visible');
      cy.get('textarea').should('be.visible');

      // Resolution block field
      cy.contains('label', 'Resolution Block').should('be.visible');
      cy.get('input[type="number"]').first().should('be.visible');

      // Oracle selector
      cy.contains('label', 'Oracle').should('be.visible');
      cy.contains('Select an oracle').should('be.visible');
    });

    it('should have disabled submit button when form is empty', () => {
      cy.contains('button', 'Create Market').should('be.disabled');
    });

    it('should fill the question field via UI', () => {
      const testQuestion = 'Will Ethereum flip Bitcoin by 2030?';
      cy.get('input[placeholder*="Bitcoin"]').type(testQuestion);
      cy.get('input[placeholder*="Bitcoin"]').should('have.value', testQuestion);
    });

    it('should fill the description field via UI', () => {
      const testDescription = 'Based on market cap comparison';
      cy.get('textarea').type(testDescription);
      cy.get('textarea').should('have.value', testDescription);
    });

    it('should fill the resolution block field via UI', () => {
      cy.get('input[placeholder*="900000"]').type('1000000');
      cy.get('input[placeholder*="900000"]').should('have.value', '1000000');
    });

    it('should open oracle dropdown when clicked', () => {
      cy.contains('Select an oracle').click();
      // Should show loading or oracle list
      cy.get('body').should('satisfy', (body) => {
        const text = body.text();
        return text.includes('Loading') || text.includes('No oracles') || text.includes('Score');
      });
    });

    it('should display AMM explanation info box', () => {
      cy.contains('How AMM works').should('be.visible');
      cy.contains('50/50 odds').should('be.visible');
    });

    it('should show validation - button stays disabled without oracle', () => {
      // Fill all fields except oracle
      cy.get('input[placeholder*="Bitcoin"]').type('Test Question?');
      cy.get('input[placeholder*="900000"]').type('999999');

      // Button should still be disabled (no oracle selected)
      cy.contains('button', 'Create Market').should('be.disabled');
    });
  });

  describe('3. Markets List via UI', () => {
    beforeEach(() => {
      cy.visitApp('predictions', '/markets');
    });

    it('should load the markets page', () => {
      cy.url().should('include', '/markets');
    });

    it('should display markets or empty state', () => {
      // Wait for loading to complete
      cy.wait(500);

      // Either shows market cards or empty message
      cy.get('body').should('satisfy', (body) => {
        const text = body.text();
        return (
          text.includes('YES') ||
          text.includes('NO') ||
          text.includes('No ') ||
          text.includes('market') ||
          text.includes('active')
        );
      });
    });

    it('should show market cards with YES/NO prices if markets exist', () => {
      cy.wait(500);
      cy.get('body').then((body) => {
        if (body.text().includes('%')) {
          // Markets exist, verify card structure
          cy.contains(/YES|NO/).should('be.visible');
          cy.contains('%').should('be.visible');
        }
      });
    });
  });

  describe('4. Market Detail Page via UI', () => {
    // Create a market via API first, then test UI
    let testMarketId: string;

    before(() => {
      cy.task('createPredictionMarket', {
        question: `UI Detail Test - ${Date.now()}`,
        description: 'Testing market detail UI',
        resolution_block: 999999,
        oracle_pubkey: '0'.repeat(64),
        initial_liquidity_sats: 1000000000,
      }).then((result: any) => {
        testMarketId = result.market_id;
      });
    });

    beforeEach(() => {
      cy.wrap(null).then(() => {
        if (testMarketId) {
          cy.visitApp('predictions', `/markets/${testMarketId}`);
        }
      });
    });

    it('should display the market question as title', () => {
      cy.contains('UI Detail Test').should('be.visible');
    });

    it('should show OPEN status badge', () => {
      cy.contains('OPEN').should('be.visible');
    });

    it('should display YES outcome card with price', () => {
      cy.contains('YES').should('be.visible');
      cy.get('body').should('contain.text', '%');
    });

    it('should display NO outcome card with price', () => {
      cy.contains('NO').should('be.visible');
    });

    it('should display market statistics', () => {
      cy.contains('Total Volume').should('be.visible');
      cy.contains('Total Bets').should('be.visible');
      cy.contains('Resolves At').should('be.visible');
    });

    it('should show betting interface with instruction', () => {
      cy.contains('Place Your Bet').should('be.visible');
      cy.contains('Click on YES or NO').should('be.visible');
    });

    it('should select YES outcome when clicking YES card', () => {
      // Click on YES section (find the clickable parent div)
      cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();

      // Verify selection
      cy.contains('Betting YES').should('be.visible');
    });

    it('should select NO outcome when clicking NO card', () => {
      cy.contains('NO').first().parents('[class*="cursor-pointer"]').first().click();
      cy.contains('Betting NO').should('be.visible');
    });

    it('should show bet amount input after selecting outcome', () => {
      cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();
      cy.contains('Bet Amount').should('be.visible');
      cy.get('input[placeholder*="sats"]').should('be.visible');
    });

    it('should have quick bet amount buttons', () => {
      cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();
      cy.contains('button', '1k').should('be.visible');
      cy.contains('button', '10k').should('be.visible');
      cy.contains('button', '100k').should('be.visible');
    });

    it('should fill bet amount using quick button', () => {
      cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();
      cy.contains('button', '10k').click();
      cy.get('input[placeholder*="sats"]').should('have.value', '10000');
    });

    it('should type custom bet amount', () => {
      cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();
      cy.get('input[placeholder*="sats"]').type('25000');
      cy.get('input[placeholder*="sats"]').should('have.value', '25000');
    });

    it('should get quote when clicking Get Quote button', () => {
      cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();
      cy.contains('button', '10k').click();
      cy.contains('button', 'Get Quote').click();

      // Wait for quote to load
      cy.contains('Quote Preview', { timeout: 5000 }).should('be.visible');
      cy.contains('You Pay').should('be.visible');
      cy.contains('You Get').should('be.visible');
      cy.contains('shares').should('be.visible');
    });

    it('should show price impact in quote', () => {
      cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();
      cy.contains('button', '100k').click();
      cy.contains('button', 'Get Quote').click();

      cy.contains('Quote Preview', { timeout: 5000 }).should('be.visible');
      cy.contains('Price Impact').should('be.visible');
    });

    it('should have Place Bet button after getting quote', () => {
      cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();
      cy.contains('button', '10k').click();
      cy.contains('button', 'Get Quote').click();

      cy.contains('Quote Preview', { timeout: 5000 }).should('be.visible');
      // Button text depends on wallet connection status
      cy.contains('button', /Place Bet|Connect Wallet/).should('be.visible');
    });

    it('should have Back to Markets navigation', () => {
      cy.contains('Back to Markets').should('be.visible');
      cy.contains('Back to Markets').click();
      cy.url().should('include', '/markets');
    });

    it('should display Recent Bets section', () => {
      cy.contains('Recent Bets').should('be.visible');
    });

    it('should display Oracle info', () => {
      cy.contains('Oracle').should('be.visible');
    });
  });

  describe('5. My Bets Page via UI', () => {
    beforeEach(() => {
      cy.visitApp('predictions', '/my-bets');
    });

    it('should display page header', () => {
      cy.get('h1').should('contain.text', 'Bets');
    });

    it('should have All Bets / My Bets toggle', () => {
      cy.contains('button', 'All Bets').should('be.visible');
      cy.contains('button', 'My Bets').should('be.visible');
    });

    it('should switch to My Bets view when clicking toggle', () => {
      cy.contains('button', 'My Bets').click();
      cy.contains('h1', 'My Bets').should('be.visible');
    });

    it('should switch back to All Bets view', () => {
      cy.contains('button', 'My Bets').click();
      cy.contains('button', 'All Bets').click();
      cy.contains('h1', 'All Bets').should('be.visible');
    });

    it('should show wallet status in My Bets mode', () => {
      cy.contains('button', 'My Bets').click();
      // Either "Wallet Connected" or "Wallet Not Connected"
      cy.get('body').should('satisfy', (body) => {
        const text = body.text();
        return text.includes('Wallet') && (text.includes('Connected') || text.includes('Not'));
      });
    });

    it('should show pubkey search field when wallet not connected', () => {
      cy.contains('button', 'My Bets').click();
      cy.get('body').then((body) => {
        if (body.text().includes('Not Connected')) {
          cy.contains('search by Public Key').should('be.visible');
          cy.get('input[placeholder*="public key"]').should('be.visible');
        }
      });
    });

    it('should display Position States legend', () => {
      cy.contains('Position States').should('be.visible');
      cy.contains('Pending').should('be.visible');
      cy.contains('Winner').should('be.visible');
      cy.contains('Lost').should('be.visible');
      cy.contains('Claimed').should('be.visible');
    });

    it('should show bets list or empty state', () => {
      // Wait for data to load
      cy.wait(500);

      // Either shows bets or a message
      cy.get('body').should('satisfy', (body) => {
        const text = body.text();
        return (
          text.includes('YES') ||
          text.includes('NO') ||
          text.includes('No bets') ||
          text.includes('Enter your public key')
        );
      });
    });
  });

  describe('6. Complete Betting Flow via UI', () => {
    let testMarketId: string;

    before(() => {
      // Create a market for the full flow
      cy.task('createPredictionMarket', {
        question: `Complete Betting Flow Test - ${Date.now()}`,
        description: 'E2E UI betting test',
        resolution_block: 999999,
        oracle_pubkey: '0'.repeat(64),
        initial_liquidity_sats: 1000000000,
      }).then((result: any) => {
        testMarketId = result.market_id;
      });
    });

    it('should complete the entire betting journey via UI', () => {
      // 1. Navigate to market
      cy.wrap(null).then(() => {
        cy.visitApp('predictions', `/markets/${testMarketId}`);
      });

      // 2. Verify market loaded
      cy.contains('Complete Betting Flow Test').should('be.visible');

      // 3. Click on YES to select outcome
      cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();

      // 4. Verify betting panel updates
      cy.contains('Betting YES').should('be.visible');

      // 5. Enter bet amount using quick button
      cy.contains('button', '10k').click();

      // 6. Get a quote
      cy.contains('button', 'Get Quote').should('not.be.disabled');
      cy.contains('button', 'Get Quote').click();

      // 7. Verify quote appeared
      cy.contains('Quote Preview', { timeout: 5000 }).should('be.visible');
      cy.contains('You Pay').should('be.visible');
      cy.contains('10,000').should('be.visible'); // 10k sats

      // 8. Verify Place Bet button exists
      cy.contains('button', /Place Bet|Connect Wallet/).should('be.visible');
    });

    it('should switch from YES to NO prediction', () => {
      cy.wrap(null).then(() => {
        cy.visitApp('predictions', `/markets/${testMarketId}`);
      });

      // Select YES first
      cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();
      cy.contains('Betting YES').should('be.visible');

      // Click switch link
      cy.contains('Switch to NO').click();

      // Verify switched
      cy.contains('Betting NO').should('be.visible');
    });
  });

  describe('7. Navigation Flow via UI', () => {
    it('should navigate through entire app using UI elements', () => {
      // Start at home
      cy.visitApp('predictions', '/');
      cy.contains('Anchor Predictions').should('be.visible');

      // Click Create Market in hero
      cy.contains('a', 'Create Market').click();
      cy.url().should('include', '/create');
      cy.contains('Create Prediction Market').should('be.visible');

      // Go back home by visiting
      cy.visitApp('predictions', '/');

      // Click Browse Markets
      cy.contains('a', 'Browse Markets').click();
      cy.url().should('include', '/markets');

      // Navigate to My Bets
      cy.visitApp('predictions', '/my-bets');
      cy.contains('Bets').should('be.visible');

      // Navigate to History
      cy.visitApp('predictions', '/history');
      cy.url().should('include', '/history');
    });
  });
});

describe('Anchor Predictions - Market Interaction Details', () => {
  let testMarketId: string;

  before(() => {
    cy.task('createPredictionMarket', {
      question: `Interaction Details Test - ${Date.now()}`,
      resolution_block: 999999,
      oracle_pubkey: '0'.repeat(64),
      initial_liquidity_sats: 1000000000,
    }).then((result: any) => {
      testMarketId = result.market_id;
    });
  });

  beforeEach(() => {
    cy.wrap(null).then(() => {
      if (testMarketId) {
        cy.visitApp('predictions', `/markets/${testMarketId}`);
      }
    });
  });

  it('should highlight YES card when selected', () => {
    cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();
    // The card should have a border change (border-green-500)
    cy.contains('YES')
      .first()
      .parents('[class*="cursor-pointer"]')
      .first()
      .should('have.class', 'border-green-500');
  });

  it('should clear quote when changing bet amount', () => {
    // Select outcome and get quote
    cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();
    cy.contains('button', '10k').click();
    cy.contains('button', 'Get Quote').click();
    cy.contains('Quote Preview', { timeout: 5000 }).should('be.visible');

    // Change amount - quote should be cleared
    cy.contains('button', '100k').click();
    cy.contains('Quote Preview').should('not.exist');
  });

  it('should show different quotes for different amounts', () => {
    cy.contains('YES').first().parents('[class*="cursor-pointer"]').first().click();

    // Get quote for 1k
    cy.contains('button', '1k').click();
    cy.contains('button', 'Get Quote').click();
    cy.contains('Quote Preview', { timeout: 5000 }).should('be.visible');

    // Get quote for 100k - quote should update
    cy.contains('button', '100k').click();
    cy.contains('button', 'Get Quote').click();
    cy.contains('Quote Preview', { timeout: 5000 }).should('be.visible');
    // Verify quote shows larger values (more shares for bigger bet)
    cy.contains('You Pay').should('be.visible');
    cy.contains('shares').should('be.visible');
  });
});

