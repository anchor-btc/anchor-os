/**
 * E2E Tests for Anchor Predictions - API Integration Tests
 *
 * These tests verify the backend API directly:
 * - Market creation API
 * - Bet placement API
 * - Position retrieval API
 * - AMM price calculations
 *
 * Note: For UI-based tests, see complete-ui-flow.cy.ts
 */

describe('Anchor Predictions - API Integration', () => {
  const testOraclePubkey = '0'.repeat(64);
  const testUserPubkey = '1'.repeat(64);

  describe('Market Creation API', () => {
    it('should create a new market successfully', () => {
      const marketData = {
        question: `API Test Market - ${Date.now()}`,
        description: 'API integration test',
        resolution_block: 999999,
        oracle_pubkey: testOraclePubkey,
        initial_liquidity_sats: 1000000000,
      };

      cy.task('createPredictionMarket', marketData).then((result: any) => {
        expect(result.status).to.equal('success');
        expect(result.market_id).to.exist;
        expect(result.question).to.equal(marketData.question);
      });
    });
  });

  describe('Bet Placement API', () => {
    let testMarketId: string;

    before(() => {
      cy.task('createPredictionMarket', {
        question: `Bet API Test - ${Date.now()}`,
        resolution_block: 999999,
        oracle_pubkey: testOraclePubkey,
        initial_liquidity_sats: 1000000000,
      }).then((result: any) => {
        testMarketId = result.market_id;
      });
    });

    it('should place a YES bet and return shares', () => {
      cy.wrap(null)
        .then(() => {
          return cy.task('placePredictionBet', {
            marketId: testMarketId,
            outcome: 1,
            amount_sats: 10000,
            user_pubkey: testUserPubkey,
          });
        })
        .then((result: any) => {
          expect(result.status).to.equal('success');
          expect(result.outcome).to.equal('YES');
          expect(result.shares).to.be.greaterThan(0);
        });
    });

    it('should place a NO bet and return shares', () => {
      cy.wrap(null)
        .then(() => {
          return cy.task('placePredictionBet', {
            marketId: testMarketId,
            outcome: 0,
            amount_sats: 5000,
            user_pubkey: testUserPubkey,
          });
        })
        .then((result: any) => {
          expect(result.status).to.equal('success');
          expect(result.outcome).to.equal('NO');
          expect(result.shares).to.be.greaterThan(0);
        });
    });

    it('should create positions in database', () => {
      cy.wrap(null)
        .then(() => {
          return cy.task('getMarketPositions', testMarketId);
        })
        .then((positions: any) => {
          expect(positions).to.be.an('array');
          expect(positions.length).to.be.greaterThan(0);
        });
    });

    it('should update AMM prices after bets', () => {
      cy.wrap(null)
        .then(() => {
          return cy.task('getPredictionMarket', testMarketId);
        })
        .then((market: any) => {
          expect(market.yes_price).to.be.a('number');
          expect(market.no_price).to.be.a('number');
          expect(market.total_volume_sats).to.be.greaterThan(0);
          // Prices should sum close to 1
          expect(market.yes_price + market.no_price).to.be.closeTo(1, 0.01);
        });
    });
  });
});

describe('Anchor Predictions - API Health Check', () => {
  it('should have healthy backend API', () => {
    cy.request('http://localhost:3801/health').then((response) => {
      expect(response.status).to.equal(200);
    });
  });

  it('should return stats from API', () => {
    cy.request('http://localhost:3801/api/stats').then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('total_markets');
      expect(response.body).to.have.property('active_markets');
    });
  });

  it('should return markets list from API', () => {
    cy.request('http://localhost:3801/api/markets').then((response) => {
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
    });
  });
});
