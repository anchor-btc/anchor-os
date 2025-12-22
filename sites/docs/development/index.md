# Development Guide

Welcome to the Anchor Protocol development guide. This section covers everything you need to contribute to the project.

## Prerequisites

Before you begin, ensure you have:

- **Docker** 24+ with Docker Compose V2
- **Node.js** 18+
- **Rust** 1.75+ (for backend development)
- **Git**

## Quick Start

```bash
# Clone the repository
git clone https://github.com/AnchorProtocol/anchor.git
cd anchor

# Initial setup
make setup

# Start services
make up

# View dashboard
open http://localhost:8000
```

## Development Sections

<div class="tip custom-block" style="padding-top: 8px">

**Explore the development docs:**

- [Project Structure](/development/project-structure) - Understand the codebase organization
- [Docker Setup](/development/docker) - Docker Compose configuration and profiles
- [Scripts](/development/scripts) - Automation scripts for common tasks
- [Makefile](/development/makefile) - Quick commands for development

</div>

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Apps                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Threads │ │ Canvas  │ │ Domains │ │ Tokens  │  ...      │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│       │           │           │           │                 │
│       └───────────┴─────┬─────┴───────────┘                 │
│                         │                                   │
│                    ┌────┴────┐                              │
│                    │ Wallet  │                              │
│                    │  API    │                              │
│                    └────┬────┘                              │
│                         │                                   │
│       ┌─────────────────┼─────────────────┐                 │
│       │                 │                 │                 │
│  ┌────┴────┐      ┌────┴────┐      ┌────┴────┐             │
│  │ Bitcoin │      │ Indexer │      │Postgres │             │
│  │  Core   │      │         │      │         │             │
│  └─────────┘      └─────────┘      └─────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## Key Technologies

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Rust, Axum, Tokio |
| Database | PostgreSQL |
| Blockchain | Bitcoin Core (regtest/mainnet) |
| Infrastructure | Docker Compose |

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/AnchorProtocol/anchor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AnchorProtocol/anchor/discussions)


