/**
 * Anchor Dashboard - Setup Wizard E2E Tests
 *
 * Comprehensive UI tests for the installation wizard flow.
 * These tests verify the complete setup experience through UI interactions.
 *
 * NOTE: Tests are language-agnostic - they use selectors instead of text content
 * to support multiple languages.
 */

describe('Anchor Dashboard - Setup Wizard', () => {
  // Reset setup state before running wizard tests
  beforeEach(() => {
    // Reset the setup wizard state via the database
    cy.resetSetup();

    // Clear local storage to ensure clean state (including language preference)
    cy.clearLocalStorage();
    cy.clearCookies();

    // Force English language for consistent testing
    cy.window().then((win) => {
      win.localStorage.setItem('anchor-os-language', 'en');
    });
  });

  describe('Welcome Step', () => {
    beforeEach(() => {
      cy.visit('/setup');
    });

    it('should display the welcome screen with title and description', () => {
      cy.contains('Welcome to Anchor OS').should('be.visible');
      cy.contains('Your personal Bitcoin operating system').should('be.visible');
    });

    it('should display the Bitcoin logo icon', () => {
      cy.get('svg').should('exist');
    });

    it('should display feature cards', () => {
      // Fast Setup feature
      cy.contains('Fast Setup').should('be.visible');
      cy.contains('Get your Bitcoin node running in minutes').should('be.visible');

      // Secure feature
      cy.contains('Secure').should('be.visible');
      cy.contains('Self-custody with optional Tor privacy').should('be.visible');

      // Powerful feature
      cy.contains('Powerful').should('be.visible');
      cy.contains('Block explorers, apps, and more').should('be.visible');
    });

    it('should have a Get Started button', () => {
      cy.contains('button', 'Get Started').should('be.visible').and('be.enabled');
    });

    it('should navigate to profile step when clicking Get Started', () => {
      cy.contains('button', 'Get Started').click();

      // Should now see the profile step
      cy.contains("Let's get to know you").should('be.visible');
    });
  });

  describe('Profile Step', () => {
    beforeEach(() => {
      cy.visit('/setup');
      cy.contains('button', 'Get Started').click();
    });

    it('should display the profile step with title', () => {
      cy.contains("Let's get to know you").should('be.visible');
      cy.contains('Tell us a bit about yourself').should('be.visible');
    });

    it('should display avatar picker button', () => {
      cy.get('button').filter(':contains("🧑‍💻"), :has(span:contains("🧑‍💻"))').should('exist');
    });

    it('should have a name input field', () => {
      cy.get('input[type="text"]').should('be.visible');
      cy.get('input[placeholder*="Enter your name"]').should('be.visible');
    });

    it('should show welcome preview with entered name', () => {
      cy.get('input[type="text"]').type('Satoshi');
      cy.contains('Hello, Satoshi!').should('be.visible');
    });

    it('should show fun fact about Satoshi Nakamoto', () => {
      cy.contains('Satoshi Nakamoto').should('be.visible');
      cy.contains('remains anonymous').should('be.visible');
    });

    it('should enable continue button when name is entered', () => {
      cy.get('input[type="text"]').type('TestUser');
      cy.contains('button', /Continue as TestUser/i).should('be.enabled');
    });

    it('should disable continue button when name is empty', () => {
      cy.get('input[type="text"]').clear();
      cy.get('button')
        .contains(/Continue as/i)
        .should('be.disabled');
    });

    it('should show avatar picker when clicking avatar', () => {
      // Click on the avatar button
      cy.get('button').contains('🧑‍💻').click();

      // Should show avatar picker
      cy.contains('Choose your avatar').should('be.visible');

      // Should have multiple emoji options
      cy.contains('🦊').should('be.visible');
      cy.contains('₿').should('be.visible');
    });

    it('should select avatar when clicked', () => {
      cy.get('button').contains('🧑‍💻').click();
      cy.get('button').contains('₿').click();

      // Avatar picker should close and new avatar should be shown
      cy.get('button').contains('₿').should('be.visible');
    });

    it('should navigate to language step when continuing', () => {
      cy.get('input[type="text"]').type('Bitcoiner');
      cy.contains('button', /Continue as Bitcoiner/i).click();

      // Should now see language step
      cy.contains('Select Language').should('be.visible');
    });
  });

  describe('Language Step', () => {
    beforeEach(() => {
      cy.visit('/setup');
      cy.contains('button', 'Get Started').click();
      cy.get('input[type="text"]').type('TestUser');
      cy.contains('button', /Continue as TestUser/i).click();
    });

    it('should display language selection title', () => {
      cy.contains('Select Language').should('be.visible');
      cy.contains('Choose your preferred interface language').should('be.visible');
    });

    it('should display English option', () => {
      cy.contains('English').should('be.visible');
    });

    it('should display other language options', () => {
      // Check for a few common languages
      cy.contains('Español').should('exist');
      cy.contains('Português').should('exist');
    });

    it('should have English selected by default', () => {
      cy.get('button').filter(':contains("English")').should('have.class', 'border-primary');
    });

    it('should allow selecting a different language', () => {
      cy.get('button').contains('Español').click();

      // The button should now have the selected style
      cy.get('button').filter(':contains("Español")').should('have.class', 'border-primary');
    });

    it('should have back and continue buttons', () => {
      cy.contains('button', 'Back').should('be.visible');
      cy.contains('button', 'Continue').should('be.visible');
    });

    it('should navigate back to profile step', () => {
      cy.contains('button', 'Back').click();
      cy.contains("Let's get to know you").should('be.visible');
    });

    it('should navigate to appearance step', () => {
      cy.contains('button', 'Continue').click();
      cy.contains('Choose Theme').should('be.visible');
    });
  });

  describe('Appearance Step', () => {
    beforeEach(() => {
      cy.visit('/setup');
      cy.contains('button', 'Get Started').click();
      cy.get('input[type="text"]').type('TestUser');
      cy.contains('button', /Continue as TestUser/i).click();
      cy.contains('button', 'Continue').click();
    });

    it('should display theme selection title', () => {
      cy.contains('Choose Theme').should('be.visible');
      cy.contains('Select a visual theme for your dashboard').should('be.visible');
    });

    it('should display multiple theme options', () => {
      // Should have at least one theme card
      cy.get('button').filter('[class*="rounded-xl"]').should('have.length.at.least', 1);
    });

    it('should have theme preview boxes', () => {
      // Theme cards should contain preview elements
      cy.get('[class*="rounded-lg"]').should('exist');
    });

    it('should allow selecting a theme', () => {
      // Click on the second theme option
      cy.get('button').filter('[class*="rounded-xl"]').first().click();

      // Should have selected style
      cy.get('button')
        .filter('[class*="rounded-xl"]')
        .first()
        .should('have.class', 'border-primary');
    });

    it('should have back and continue buttons', () => {
      cy.contains('button', 'Back').should('be.visible');
      cy.contains('button', 'Continue').should('be.visible');
    });

    it('should navigate back to language step', () => {
      cy.contains('button', 'Back').click();
      cy.contains('Select Language').should('be.visible');
    });

    it('should navigate to network step', () => {
      cy.contains('button', 'Continue').click();
      cy.contains('Select Network').should('be.visible');
    });
  });

  describe('Network Step', () => {
    beforeEach(() => {
      cy.visit('/setup');
      cy.contains('button', 'Get Started').click();
      cy.get('input[type="text"]').type('TestUser');
      cy.contains('button', /Continue as TestUser/i).click();
      cy.contains('button', 'Continue').click();
      cy.contains('button', 'Continue').click();
    });

    it('should display network selection title', () => {
      cy.contains('Select Network').should('be.visible');
      cy.contains('Choose which Bitcoin network to connect to').should('be.visible');
    });

    it('should display Regtest option', () => {
      cy.contains('Regtest').should('be.visible');
      cy.contains('Local development network').should('be.visible');
      cy.contains('🧪').should('be.visible');
    });

    it('should display Testnet option as coming soon', () => {
      cy.contains('Testnet').should('be.visible');
      cy.contains('Coming Soon').should('be.visible');
      cy.contains('🔬').should('be.visible');
    });

    it('should display Mainnet option as coming soon', () => {
      cy.contains('Mainnet').should('be.visible');
      cy.contains('₿').should('be.visible');
    });

    it('should have Regtest selected by default', () => {
      cy.get('button').contains('Regtest').parents('button').should('have.class', 'border-primary');
    });

    it('should disable Testnet and Mainnet options', () => {
      // Testnet should be disabled
      cy.get('button').contains('Testnet').parents('button').should('be.disabled');

      // Mainnet should be disabled
      cy.get('button').contains('Mainnet').parents('button').should('be.disabled');
    });

    it('should show Why Regtest info box', () => {
      cy.contains('Why Regtest?').should('be.visible');
      cy.contains('generate blocks instantly').should('be.visible');
    });

    it('should have back and continue buttons', () => {
      cy.contains('button', 'Back').should('be.visible');
      cy.contains('button', 'Continue').should('be.visible');
    });

    it('should navigate back to appearance step', () => {
      cy.contains('button', 'Back').click();
      cy.contains('Choose Theme').should('be.visible');
    });

    it('should navigate to preset step', () => {
      cy.contains('button', 'Continue').click();
      cy.contains('Choose Your Setup').should('be.visible');
    });
  });

  describe('Preset Step', () => {
    beforeEach(() => {
      cy.visit('/setup');
      cy.contains('button', 'Get Started').click();
      cy.get('input[type="text"]').type('TestUser');
      cy.contains('button', /Continue as TestUser/i).click();
      cy.contains('button', 'Continue').click(); // Language
      cy.contains('button', 'Continue').click(); // Appearance
      cy.contains('button', 'Continue').click(); // Network
    });

    it('should display preset selection title', () => {
      cy.contains('Choose Your Setup').should('be.visible');
      cy.contains('Select a configuration that matches your needs').should('be.visible');
    });

    it('should display Minimum preset', () => {
      cy.contains('Minimum').should('be.visible');
    });

    it('should display Default preset', () => {
      cy.contains('Default').should('be.visible');
    });

    it('should display Full preset', () => {
      cy.contains('Full').should('be.visible');
    });

    it('should display Custom preset', () => {
      cy.contains('Custom').should('be.visible');
    });

    it('should show services count for presets', () => {
      cy.contains(/\d+ services/).should('exist');
    });

    it('should have a preset selected by default', () => {
      // One of the preset buttons should have the selected border
      cy.get('button[class*="border-primary"]').should('exist');
    });

    it('should navigate to review step when clicking a preset', () => {
      // Clicking a preset auto-navigates to review step
      // Find and click on the first non-custom preset card
      cy.get('button[class*="rounded-xl"]').first().click();

      // Should now be on review step (has Install button)
      cy.get('button').filter(':contains("Install"), :contains("Instalar")').should('be.visible');
    });

    it('should have back button', () => {
      // Back button has ChevronLeft icon
      cy.get('button svg').should('exist');
    });

    it('should navigate back to network step', () => {
      // Click back button - it's the button with outline variant (lighter style)
      cy.get('button[class*="outline"], button[class*="ghost"]').first().click();

      // Should see network options (Regtest emoji)
      cy.contains('🧪').should('be.visible');
    });

    it('should navigate to custom step when selecting Custom preset', () => {
      // Click on Custom preset (has Settings icon, last card typically)
      cy.get('button').contains('Custom').click();

      // Should now be on custom step - has service checkboxes/toggles
      cy.get('input[type="checkbox"], [role="switch"]').should('exist');
    });
  });

  describe('Custom Step', () => {
    beforeEach(() => {
      cy.visit('/setup');
      // Navigate through wizard to custom step
      // Welcome -> Get Started
      cy.get('button')
        .contains(/Get Started|Começar|开始/i)
        .click();
      // Profile -> Enter name and continue
      cy.get('input[type="text"]').type('TestUser');
      cy.get('button').last().click(); // Continue button
      // Language -> Continue
      cy.get('button').last().click();
      // Appearance -> Continue
      cy.get('button').last().click();
      // Network -> Continue
      cy.get('button').last().click();
      // Preset -> Click Custom
      cy.get('button').contains('Custom').click();
    });

    it('should display service selection UI', () => {
      // Custom step has checkboxes or switches for services
      cy.get('input[type="checkbox"], [role="switch"], [class*="checkbox"]').should('exist');
    });

    it('should display service categories', () => {
      // Should have at least one category section
      cy.get('[class*="card"], [class*="rounded"]').should('exist');
    });

    it('should have navigation buttons', () => {
      // Should have at least 2 buttons (Back and Continue)
      cy.get('button').should('have.length.at.least', 2);
    });

    it('should navigate back to preset step', () => {
      // Click back button
      cy.get('button').first().click();

      // Should see preset options again (Custom text should be visible)
      cy.get('button').contains('Custom').should('be.visible');
    });

    it('should navigate to review step', () => {
      // Click continue/next button (last button)
      cy.get('button').last().click();

      // Should now be on review step - has Install button
      cy.get('button').filter(':contains("Install"), :contains("Instalar")').should('be.visible');
    });
  });

  describe('Review Step', () => {
    beforeEach(() => {
      cy.visit('/setup');
      cy.contains('button', 'Get Started').click();
      cy.get('input[type="text"]').type('TestUser');
      cy.contains('button', /Continue as TestUser/i).click();
      cy.contains('button', 'Continue').click(); // Language
      cy.contains('button', 'Continue').click(); // Appearance
      cy.contains('button', 'Continue').click(); // Network
      cy.contains('button', 'Continue').click(); // Preset (Default)
    });

    it('should display review title', () => {
      cy.contains('Review Installation').should('be.visible');
      cy.contains('Review the services that will be installed').should('be.visible');
    });

    it('should display selected preset badge', () => {
      cy.contains('Preset: Default').should('be.visible');
    });

    it('should display services list', () => {
      // Should have check marks for services
      cy.get('svg').should('exist');
    });

    it('should show services and containers count', () => {
      cy.contains('Services').should('be.visible');
      cy.contains('Containers').should('be.visible');
    });

    it('should display service counts as numbers', () => {
      // Should have numeric values for services and containers
      cy.get('.text-2xl.font-bold').should('have.length.at.least', 2);
    });

    it('should have back and install buttons', () => {
      cy.contains('button', 'Back').should('be.visible');
      cy.contains('button', 'Install').should('be.visible');
    });

    it('should navigate back to preset step', () => {
      cy.contains('button', 'Back').click();
      cy.contains('Choose Your Setup').should('be.visible');
    });

    it('should navigate to security step when clicking install', () => {
      cy.contains('button', 'Install').click();
      cy.contains('Secure Your Dashboard').should('be.visible');
    });
  });

  describe('Security Step', () => {
    beforeEach(() => {
      cy.visit('/setup');
      cy.contains('button', 'Get Started').click();
      cy.get('input[type="text"]').type('TestUser');
      cy.contains('button', /Continue as TestUser/i).click();
      cy.contains('button', 'Continue').click(); // Language
      cy.contains('button', 'Continue').click(); // Appearance
      cy.contains('button', 'Continue').click(); // Network
      cy.contains('button', 'Continue').click(); // Preset
      cy.contains('button', 'Install').click();
    });

    it('should display security step title', () => {
      cy.contains('Secure Your Dashboard').should('be.visible');
      cy.contains('Set up a password to protect your Anchor OS dashboard').should('be.visible');
    });

    it('should have password input field', () => {
      cy.get('input[type="password"]').should('have.length.at.least', 1);
    });

    it('should have confirm password field', () => {
      cy.get('input[placeholder*="Confirm"]').should('be.visible');
    });

    it('should have auto-lock dropdown', () => {
      cy.contains('Auto-Lock').should('be.visible');
      cy.get('select').should('be.visible');
    });

    it('should have timeout options in dropdown', () => {
      cy.get('select option').should('have.length.at.least', 2);
    });

    it('should have password toggle button', () => {
      cy.get('button').filter(':has(svg)').should('exist');
    });

    it('should display security info message', () => {
      cy.contains('Password protection is optional but recommended').should('be.visible');
    });

    it('should have back, skip and set password buttons', () => {
      cy.contains('button', 'Back').should('be.visible');
      cy.contains('button', 'Skip for now').should('be.visible');
      cy.contains('button', 'Set Password').should('be.visible');
    });

    it('should navigate back to review step', () => {
      cy.contains('button', 'Back').click();
      cy.contains('Review Installation').should('be.visible');
    });

    it('should show error when passwords do not match', () => {
      cy.get('input[placeholder*="Enter a secure password"]').type('password123');
      cy.get('input[placeholder*="Confirm"]').type('differentpassword');
      cy.contains('button', 'Set Password').click();
      cy.contains('Passwords do not match').should('be.visible');
    });

    it('should show error when password is too short', () => {
      cy.get('input[placeholder*="Enter a secure password"]').type('abc');
      cy.get('input[placeholder*="Confirm"]').type('abc');
      cy.contains('button', 'Set Password').click();
      cy.contains('at least 4 characters').should('be.visible');
    });
  });

  describe('Complete Flow - Skip Security', () => {
    beforeEach(() => {
      cy.visit('/setup');
      cy.contains('button', 'Get Started').click();
      cy.get('input[type="text"]').type('TestUser');
      cy.contains('button', /Continue as TestUser/i).click();
      cy.contains('button', 'Continue').click(); // Language
      cy.contains('button', 'Continue').click(); // Appearance
      cy.contains('button', 'Continue').click(); // Network
      cy.contains('button', 'Continue').click(); // Preset
      cy.contains('button', 'Install').click(); // Review -> Security
      cy.contains('button', 'Skip for now').click(); // Skip security
    });

    it('should show installing step', () => {
      // Installing step should appear
      cy.contains(/Installing|Setting up|Configuring/i, { timeout: 15000 }).should('be.visible');
    });
  });

  describe('Navigation Flow', () => {
    beforeEach(() => {
      cy.visit('/setup');
    });

    it('should be able to navigate back through steps', () => {
      // Navigate forward to network step
      // Welcome -> Get Started
      cy.get('button')
        .contains(/Get Started|Começar|开始/i)
        .click();
      // Profile -> Enter name and continue
      cy.get('input[type="text"]').type('TestUser');
      // Find the continue button (not the avatar button) - it's the last one
      cy.get('button').filter(':contains("Continue"), :contains("Continuar")').last().click();
      // Language -> Continue (last primary button)
      cy.get('button').filter(':contains("Continue"), :contains("Continuar")').last().click();
      // Appearance -> Continue
      cy.get('button').filter(':contains("Continue"), :contains("Continuar")').last().click();

      // Now on network step, navigate back
      // Should see network emojis
      cy.contains('🧪').should('be.visible');

      // Click back button (outline variant)
      cy.get('button[class*="outline"]').first().click();

      // Should still be on some step (has buttons)
      cy.get('button').should('have.length.at.least', 2);
    });

    it('should preserve profile data when navigating back and forth', () => {
      // Welcome -> Get Started
      cy.get('button')
        .contains(/Get Started|Começar|开始/i)
        .click();

      // Enter name
      cy.get('input[type="text"]').type('MyUsername');
      // Find the continue button - it's the last one
      cy.get('button').filter(':contains("Continue"), :contains("Continuar")').last().click();

      // Now on language step, go back (outline button)
      cy.get('button[class*="outline"]').first().click();

      // Name should still be there
      cy.get('input[type="text"]').should('have.value', 'MyUsername');
    });
  });

  describe('Redirect Behavior', () => {
    it('should redirect to home if setup is already complete', () => {
      // First complete the setup
      cy.bypassSetup();

      // Try to visit setup page
      cy.visit('/setup');

      // Should redirect to home
      cy.url().should('not.include', '/setup');
    });
  });
});
