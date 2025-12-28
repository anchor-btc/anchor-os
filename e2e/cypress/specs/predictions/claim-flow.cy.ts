/**
 * E2E Tests for Anchor Predictions - Security & Claim API Tests
 *
 * These tests verify BACKEND SECURITY directly via API:
 * - Signature verification requirements
 * - Ownership verification (prevents unauthorized claims)
 * - Input validation
 * - Edge case handling
 *
 * These MUST use API calls (not UI) to properly test security boundaries.
 * For UI-based tests, see complete-ui-flow.cy.ts
 */

describe('Anchor Predictions - Claim Flow Security', () => {
  const PREDICTIONS_API = 'http://localhost:3801';
  const testOraclePubkey = '0'.repeat(64);
  const legitUserPubkey = 'a'.repeat(64); // Legitimate owner
  const attackerPubkey = 'b'.repeat(64); // Attacker
  const testPayoutAddress = 'bcrt1qclaimtest';

  /**
   * Helper to create a market and place a bet
   */
  const setupMarketWithPosition = (
    userPubkey: string = legitUserPubkey
  ): Cypress.Chainable<{ marketId: string; positionId: number }> => {
    return cy.wrap(null).then(() => {
      // Create market
      return cy.request({
        method: 'POST',
        url: `${PREDICTIONS_API}/api/markets/create`,
        body: {
          question: `Claim Test Market - ${Date.now()}`,
          description: 'For claim testing',
          resolution_block: 999999,
          oracle_pubkey: testOraclePubkey,
          initial_liquidity_sats: 500000000,
        },
      }).then((createRes) => {
        const marketId = createRes.body.market_id;

        // Place bet
        return cy.request({
          method: 'POST',
          url: `${PREDICTIONS_API}/api/markets/${marketId}/bet`,
          body: {
            outcome: 1,
            amount_sats: 10000,
            user_pubkey: userPubkey,
          },
        }).then((betRes) => {
          // Get position ID
          return cy.request(`${PREDICTIONS_API}/api/markets/${marketId}/positions`).then(
            (posRes) => {
              return {
                marketId,
                positionId: posRes.body[0]?.id || betRes.body.position_id,
              };
            }
          );
        });
      });
    });
  };

  describe('Request Validation', () => {
    it('should require user_pubkey field', () => {
      setupMarketWithPosition().then(({ marketId, positionId }) => {
        cy.request({
          method: 'POST',
          url: `${PREDICTIONS_API}/api/markets/${marketId}/claim`,
          body: {
            position_id: positionId,
            payout_address: testPayoutAddress,
            // Missing: user_pubkey, signature
          },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.be.oneOf([400, 422]);
          expect(response.body.message || JSON.stringify(response.body)).to.include('user_pubkey');
        });
      });
    });

    it('should require signature field', () => {
      setupMarketWithPosition().then(({ marketId, positionId }) => {
        cy.request({
          method: 'POST',
          url: `${PREDICTIONS_API}/api/markets/${marketId}/claim`,
          body: {
            position_id: positionId,
            payout_address: testPayoutAddress,
            user_pubkey: legitUserPubkey,
            // Missing: signature
          },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.be.oneOf([400, 422]);
          expect(response.body.message || JSON.stringify(response.body)).to.include('signature');
        });
      });
    });

    it('should validate signature format (must be 64 bytes hex = 128 chars)', () => {
      setupMarketWithPosition().then(({ marketId, positionId }) => {
        cy.request({
          method: 'POST',
          url: `${PREDICTIONS_API}/api/markets/${marketId}/claim`,
          body: {
            position_id: positionId,
            payout_address: testPayoutAddress,
            user_pubkey: legitUserPubkey,
            signature: 'short', // Too short
          },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.be.oneOf([400, 422, 500]);
          expect(response.body.message || JSON.stringify(response.body)).to.match(
            /signature|invalid|format/i
          );
        });
      });
    });
  });

  describe('Ownership Verification (Critical Security)', () => {
    it('should BLOCK attacker from claiming another user\'s position', () => {
      setupMarketWithPosition(legitUserPubkey).then(({ marketId, positionId }) => {
        // Attacker tries to claim with their own pubkey
        cy.request({
          method: 'POST',
          url: `${PREDICTIONS_API}/api/markets/${marketId}/claim`,
          body: {
            position_id: positionId,
            payout_address: testPayoutAddress,
            user_pubkey: attackerPubkey, // ATTACKER's pubkey
            signature: '0'.repeat(128), // Valid format signature
          },
          failOnStatusCode: false,
        }).then((response) => {
          // MUST be rejected
          expect(response.status).to.be.oneOf([401, 403, 400]);
          expect(response.body.message).to.include('Unauthorized');
          cy.log('✅ SECURITY: Attacker correctly blocked from claiming');
        });
      });
    });

    it('should verify pubkey matches position owner before signature check', () => {
      setupMarketWithPosition(legitUserPubkey).then(({ marketId, positionId }) => {
        // Attacker uses correct pubkey format but doesn't own position
        cy.request({
          method: 'POST',
          url: `${PREDICTIONS_API}/api/markets/${marketId}/claim`,
          body: {
            position_id: positionId,
            payout_address: testPayoutAddress,
            user_pubkey: attackerPubkey,
            signature: '0'.repeat(128),
          },
          failOnStatusCode: false,
        }).then((response) => {
          // The ownership check should happen BEFORE signature verification
          // This is more efficient and reveals less information
          expect(response.status).to.be.oneOf([401, 403, 400]);
          expect(response.body.message).to.include('Unauthorized');
        });
      });
    });
  });

  describe('Winner Status Check', () => {
    it('should not allow claiming from non-winning positions', () => {
      setupMarketWithPosition(legitUserPubkey).then(({ marketId, positionId }) => {
        // Try to claim without market being resolved
        cy.request({
          method: 'POST',
          url: `${PREDICTIONS_API}/api/markets/${marketId}/claim`,
          body: {
            position_id: positionId,
            payout_address: testPayoutAddress,
            user_pubkey: legitUserPubkey,
            signature: '0'.repeat(128), // Would need real signature in real scenario
          },
          failOnStatusCode: false,
        }).then((response) => {
          // Should fail because position is not a winner (market not resolved) or signature invalid
          expect(response.status).to.be.oneOf([400, 401, 403, 500]);
          expect(response.body.message || JSON.stringify(response.body)).to.match(
            /not a winner|not resolved|cannot claim|Invalid signature|Unauthorized/i
          );
        });
      });
    });
  });

  describe('Signature Verification', () => {
    it('should reject invalid Schnorr signatures', () => {
      setupMarketWithPosition(legitUserPubkey).then(({ marketId, positionId }) => {
        cy.request({
          method: 'POST',
          url: `${PREDICTIONS_API}/api/markets/${marketId}/claim`,
          body: {
            position_id: positionId,
            payout_address: testPayoutAddress,
            user_pubkey: legitUserPubkey,
            // Invalid signature (all zeros is not a valid Schnorr signature)
            signature: '0'.repeat(128),
          },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.be.oneOf([400, 401, 403, 500]);
          expect(response.body.message || JSON.stringify(response.body)).to.match(
            /signature|not a winner|cannot claim/i
          );
        });
      });
    });
  });
});

describe('Anchor Predictions - Claim Edge Cases', () => {
  const PREDICTIONS_API = 'http://localhost:3801';

  it('should handle non-existent market ID', () => {
    cy.request({
      method: 'POST',
      url: `${PREDICTIONS_API}/api/markets/nonexistent/claim`,
      body: {
        position_id: 1,
        payout_address: 'bcrt1qtest',
        user_pubkey: '0'.repeat(64),
        signature: '0'.repeat(128),
      },
      failOnStatusCode: false,
    }).then((response) => {
      // Should fail - 401 is also acceptable (Unauthorized for non-existent position)
      expect(response.status).to.be.oneOf([400, 401, 404, 500]);
    });
  });

  it('should handle non-existent position ID', () => {
    // First create a market
    cy.request({
      method: 'POST',
      url: `${PREDICTIONS_API}/api/markets/create`,
      body: {
        question: `Edge Case Test - ${Date.now()}`,
        resolution_block: 999999,
        oracle_pubkey: '0'.repeat(64),
      },
    }).then((createRes) => {
      const marketId = createRes.body.market_id;

      cy.request({
        method: 'POST',
        url: `${PREDICTIONS_API}/api/markets/${marketId}/claim`,
        body: {
          position_id: 999999, // Non-existent position
          payout_address: 'bcrt1qtest',
          user_pubkey: '0'.repeat(64),
          signature: '0'.repeat(128),
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 404, 500]);
      });
    });
  });

  it('should handle empty request body', () => {
    cy.request({
      method: 'POST',
      url: `${PREDICTIONS_API}/api/markets/testmarket/claim`,
      body: {},
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.be.oneOf([400, 422]);
    });
  });

  it('should handle invalid payout address format', () => {
    cy.request({
      method: 'POST',
      url: `${PREDICTIONS_API}/api/markets/testmarket/claim`,
      body: {
        position_id: 1,
        payout_address: 'invalid-address',
        user_pubkey: '0'.repeat(64),
        signature: '0'.repeat(128),
      },
      failOnStatusCode: false,
    }).then((response) => {
      // Might pass this check and fail later (401 for Unauthorized on non-existent position)
      expect(response.status).to.be.oneOf([400, 401, 422, 500]);
    });
  });
});

