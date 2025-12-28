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
          try {
            const response = await fetch(`${config.env.walletApi}/wallet/mine`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ blocks: count }),
            });
            return { success: true, data: await response.json() };
          } catch {
            // Service not available - return gracefully
            return { success: false, error: 'Wallet service not available' };
          }
        },

        async getBalance() {
          const response = await fetch(`${config.env.walletApi}/wallet/balance`);
          return response.json();
        },

        // Predictions-specific tasks
        async createPredictionMarket(data: {
          question: string;
          description?: string;
          resolution_block: number;
          oracle_pubkey: string;
          initial_liquidity_sats?: number;
        }) {
          const response = await fetch(
            `${config.env.predictions.replace('3800', '3801')}/api/markets/create`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            }
          );
          return response.json();
        },

        async getPredictionMarkets() {
          const response = await fetch(
            `${config.env.predictions.replace('3800', '3801')}/api/markets`
          );
          return response.json();
        },

        async getPredictionMarket(marketId: string) {
          const response = await fetch(
            `${config.env.predictions.replace('3800', '3801')}/api/markets/${marketId}`
          );
          return response.json();
        },

        async placePredictionBet(data: {
          marketId: string;
          outcome: number;
          amount_sats: number;
          user_pubkey: string;
        }) {
          const response = await fetch(
            `${config.env.predictions.replace('3800', '3801')}/api/markets/${data.marketId}/bet`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                outcome: data.outcome,
                amount_sats: data.amount_sats,
                user_pubkey: data.user_pubkey,
              }),
            }
          );
          return response.json();
        },

        async claimPredictionWinnings(data: {
          marketId: string;
          position_id: number;
          payout_address: string;
          user_pubkey: string;
          signature: string;
        }) {
          const response = await fetch(
            `${config.env.predictions.replace('3800', '3801')}/api/markets/${data.marketId}/claim`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                position_id: data.position_id,
                payout_address: data.payout_address,
                user_pubkey: data.user_pubkey,
                signature: data.signature,
              }),
            }
          );
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch {
            return { status: 'error', message: text };
          }
        },

        async claimWithoutSignature(data: {
          marketId: string;
          position_id: number;
          payout_address: string;
        }) {
          const response = await fetch(
            `${config.env.predictions.replace('3800', '3801')}/api/markets/${data.marketId}/claim`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                position_id: data.position_id,
                payout_address: data.payout_address,
              }),
            }
          );
          const text = await response.text();
          return {
            status: response.ok ? 'success' : 'error',
            message: text,
            statusCode: response.status,
          };
        },

        async getMarketPositions(marketId: string) {
          const response = await fetch(
            `${config.env.predictions.replace('3800', '3801')}/api/markets/${marketId}/positions`
          );
          return response.json();
        },

        async getMarketWinners(marketId: string) {
          const response = await fetch(
            `${config.env.predictions.replace('3800', '3801')}/api/markets/${marketId}/winners`
          );
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
            // Mark setup as completed
            await client.query(`
              UPDATE installation_config 
              SET setup_completed = TRUE, 
                  preset = 'default',
                  updated_at = NOW() 
              WHERE id = 1
            `);
            // Disable auth for testing by updating system_settings
            try {
              await client.query(`
                UPDATE system_settings 
                SET value = '{"enabled": false, "password_hash": null, "inactivity_timeout": 0}'::jsonb,
                    updated_at = NOW()
                WHERE key = 'auth'
              `);
            } catch (e) {
              console.log('Could not disable auth:', e);
            }
            return { success: true };
          } catch (error) {
            console.error('Failed to bypass setup wizard:', error);
            return { success: false, error: String(error) };
          } finally {
            await client.end();
          }
        },

        async resetSetupWizard() {
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
            // Reset setup wizard to incomplete state
            // Keep preset as 'default' since it has a NOT NULL constraint
            await client.query(`
              UPDATE installation_config 
              SET setup_completed = FALSE, 
                  preset = 'default',
                  updated_at = NOW() 
              WHERE id = 1
            `);
            // Also clear auth settings if auth_settings table exists
            try {
              await client.query(`DELETE FROM auth_settings WHERE id = 1`);
            } catch {
              // Table may not exist, ignore
            }
            return { success: true };
          } catch (error) {
            console.error('Failed to reset setup wizard:', error);
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
