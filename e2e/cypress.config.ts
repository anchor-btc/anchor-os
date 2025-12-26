import { defineConfig } from 'cypress';

const apps = {
  dashboard: 'http://localhost:8000',
  threads: 'http://localhost:3100',
  canvas: 'http://localhost:3200',
  places: 'http://localhost:3300',
  domains: 'http://localhost:3400',
  proofs: 'http://localhost:3500',
  tokens: 'http://localhost:3600',
  oracles: 'http://localhost:3700',
  predictions: 'http://localhost:3800',
};

export default defineConfig({
  e2e: {
    baseUrl: apps.dashboard,
    specPattern: 'cypress/specs/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    video: true,
    screenshotOnRunFailure: true,
    env: {
      ...apps,
      walletApi: 'http://localhost:8001',
      dashboardApi: 'http://localhost:8010',
      postgresHost: 'localhost',
      postgresPort: 5432,
      postgresDatabase: 'anchor',
      postgresUser: 'anchor',
      postgresPassword: 'anchor',
    },
    setupNodeEvents(on, config) {
      on('task', {
        async mineBlocks(count: number) {
          const response = await fetch(`${config.env.walletApi}/wallet/mine`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks: count }),
          });
          return response.json();
        },

        async getBalance() {
          const response = await fetch(`${config.env.walletApi}/wallet/balance`);
          return response.json();
        },

        async bypassSetupWizard() {
          const { Client } = await import('pg');
          const client = new Client({
            host: config.env.postgresHost,
            port: config.env.postgresPort,
            database: config.env.postgresDatabase,
            user: config.env.postgresUser,
            password: config.env.postgresPassword,
          });

          try {
            await client.connect();
            await client.query(`
              UPDATE installation_config 
              SET setup_completed = TRUE, 
                  preset = 'default',
                  updated_at = NOW() 
              WHERE id = 1
            `);
            return { success: true };
          } catch (error) {
            console.error('Failed to bypass setup wizard:', error);
            return { success: false, error: String(error) };
          } finally {
            await client.end();
          }
        },

        async resetDatabase() {
          const { Client } = await import('pg');
          const client = new Client({
            host: config.env.postgresHost,
            port: config.env.postgresPort,
            database: config.env.postgresDatabase,
            user: config.env.postgresUser,
            password: config.env.postgresPassword,
          });

          try {
            await client.connect();
            // Reset test data but keep setup completed
            await client.query(`
              UPDATE installation_config 
              SET setup_completed = TRUE, 
                  preset = 'default',
                  updated_at = NOW() 
              WHERE id = 1
            `);
            return { success: true };
          } catch (error) {
            console.error('Failed to reset database:', error);
            return { success: false, error: String(error) };
          } finally {
            await client.end();
          }
        },
      });

      return config;
    },
  },
});

