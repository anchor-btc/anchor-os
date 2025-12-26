# Anchor OS E2E Tests

End-to-end tests for Anchor OS applications using Cypress.

## Prerequisites

- Docker and Docker Compose running
- All Anchor OS services started (`docker compose up -d`)
- Node.js 18+

## Quick Start

```bash
# Install dependencies
cd e2e
npm install

# Open Cypress UI (interactive mode)
npm run cy:open

# Run all tests headless
npm run cy:run

# Run smoke tests only (home pages)
npm run cy:run:smoke
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run cy:open` | Open Cypress interactive mode |
| `npm run cy:run` | Run all tests headless |
| `npm run cy:run:dashboard` | Run Dashboard tests only |
| `npm run cy:run:domains` | Run Domains tests only |
| `npm run cy:run:proofs` | Run Proofs tests only |
| `npm run cy:run:tokens` | Run Tokens tests only |
| `npm run cy:run:threads` | Run Threads tests only |
| `npm run cy:run:canvas` | Run Canvas tests only |
| `npm run cy:run:places` | Run Places tests only |
| `npm run cy:run:oracles` | Run Oracles tests only |
| `npm run cy:run:predictions` | Run Predictions tests only |
| `npm run cy:run:smoke` | Run smoke tests (home pages only) |

## Test Structure

```
e2e/
├── cypress.config.ts         # Cypress configuration
├── package.json              # Dependencies
├── scripts/
│   └── seed-test-db.sql      # Database seed for bypassing setup wizard
└── cypress/
    ├── support/
    │   ├── commands.ts       # Custom Cypress commands
    │   └── e2e.ts            # Global setup
    ├── fixtures/
    │   └── test-file.txt     # Test files for uploads
    └── specs/
        ├── dashboard/        # Dashboard tests
        ├── domains/          # Anchor Domains tests
        ├── proofs/           # Anchor Proofs tests
        ├── tokens/           # Anchor Tokens tests
        ├── threads/          # Anchor Threads tests
        ├── canvas/           # Anchor Canvas tests
        ├── places/           # Anchor Places tests
        ├── oracles/          # Anchor Oracles tests
        └── predictions/      # Anchor Predictions tests
```

## Custom Commands

### `cy.visitApp(app, path)`
Navigate to a specific Anchor app.

```typescript
cy.visitApp('domains', '/register');
cy.visitApp('proofs', '/stamp');
```

### `cy.mineBlocks(count)`
Mine blocks on the regtest network.

```typescript
cy.mineBlocks(1); // Mine 1 block
cy.mineBlocks(6); // Mine 6 blocks for confirmations
```

### `cy.waitForTx()`
Wait for a transaction to be confirmed (mines 1 block + waits for indexer).

```typescript
cy.get('button').contains('Submit').click();
cy.waitForTx();
cy.contains('Success').should('exist');
```

### `cy.bypassSetup()`
Bypass the setup wizard (called automatically in global setup).

### `cy.getWalletBalance()`
Get the current wallet balance.

```typescript
cy.getWalletBalance().then((balance) => {
  expect(balance.confirmed).to.be.greaterThan(0);
});
```

## App URLs

| App | URL | Port |
|-----|-----|------|
| Dashboard | http://localhost:8000 | 8000 |
| Threads | http://localhost:3100 | 3100 |
| Canvas | http://localhost:3200 | 3200 |
| Places | http://localhost:3300 | 3300 |
| Domains | http://localhost:3400 | 3400 |
| Proofs | http://localhost:3500 | 3500 |
| Tokens | http://localhost:3600 | 3600 |
| Oracles | http://localhost:3700 | 3700 |
| Predictions | http://localhost:3800 | 3800 |

## Environment Variables

Configure in `cypress.config.ts` or via CLI:

```bash
CYPRESS_BASE_URL=http://localhost:8000 npm run cy:run
```

## CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`

The CI workflow:
1. Starts all Docker services
2. Bypasses setup wizard via database seed
3. Mines initial blocks for wallet funding
4. Runs Cypress tests
5. Uploads screenshots/videos on failure

### Running Specific Tests in CI

Use the workflow dispatch feature to run specific specs:

```bash
# Via GitHub Actions UI, input:
cypress/specs/domains/**
```

## Troubleshooting

### Tests failing to connect

Make sure all services are running:

```bash
docker compose ps
docker compose logs -f <service-name>
```

### Setup wizard appearing

The setup wizard should be bypassed automatically. If it appears:

```bash
docker exec core-postgres psql -U postgres -d anchor_dashboard -c "
  UPDATE installation_config SET setup_completed = TRUE WHERE id = 1;
"
```

### Transaction not confirming

Mine blocks manually:

```bash
docker exec core-bitcoin bitcoin-cli -regtest generatetoaddress 1 $(docker exec core-bitcoin bitcoin-cli -regtest getnewaddress)
```

## Writing New Tests

1. Create a new spec file in the appropriate folder
2. Use `cy.visitApp()` to navigate to the app
3. Use `cy.mineBlocks()` and `cy.waitForTx()` for blockchain operations
4. Follow existing test patterns for consistency

Example:

```typescript
describe('New Feature', () => {
  beforeEach(() => {
    cy.visitApp('domains', '/new-feature');
  });

  it('should do something', () => {
    cy.get('input').type('test');
    cy.get('button').click();
    cy.waitForTx();
    cy.contains('Success').should('exist');
  });
});
```

