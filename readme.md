# Trustless Escrow System for Enforcing Payments in Remote Work

A Solana-based escrow dApp that guarantees payment execution for remote work agreements without relying on intermediaries.
Funds are locked on-chain, released by client approval, or automatically released after a deadline.

This project demonstrates a minimal trustless escrow primitive suitable for hackathon evaluation and real-world extension.

---

## Overview

Remote work payment disputes typically arise because funds are not secured before work begins.
This system removes platform custody and arbitration by enforcing rules entirely through a Solana program.

### Core Lifecycle

1. Client locks SOL into escrow
2. Freelancer submits proof of work reference
3. Client approves release
4. OR deadline passes → anyone triggers auto-release

No centralized authority controls funds at any stage.

---

## Deployment

* **Network:** Devnet
* **Program ID:**
  `8EqACgr8ft77u2zCVK8euLWmHBqxDJ1EW6Hb54GmCzw9`

This configuration is defined in project metadata. 

---

## Features

### Mandatory (Implemented)

* Phantom wallet authentication
* Escrow creation with SOL locking
* On-chain escrow state storage
* Work submission via metadata reference
* Client approval-based release
* Trustless auto-release after deadline
* Escrow dashboard UI
* Devnet deployment

---

## Tech Stack

### On-Chain

* Rust
* Anchor Framework
* Program Derived Addresses (PDA)

### Frontend

* React + Vite
* Typescript
* Solana Wallet Adapter
* Tailwind UI components

### Tooling

* Mocha + Chai tests
* Anchor CLI
* Solana Web3.js

---

## Architecture

```
Client Wallet
      │
      ▼
Frontend Dashboard (React)
      │
      ▼
Anchor Program
      │
      ├── Escrow PDA (fund custody)
      └── State Accounts
```

---

## Escrow State Model

Stored on-chain:

* Client public key
* Freelancer public key
* Amount (lamports)
* Deadline timestamp
* Submission flag
* Release flag
* Metadata reference
* Escrow identifier

---

## Program Instructions

### Initialize Config

Sets platform parameters such as fees and treasury.

### Create Escrow

Locks SOL into PDA custody and initializes state.

### Submit Work

Freelancer attaches CID / URL / hash reference.

### Approve Release

Client authorizes payout.

### Trigger Auto Release

Anyone can release funds after deadline if work submitted.

---

## Setup Instructions

### Prerequisites

* Node 18+
* Rust toolchain
* Solana CLI
* Anchor CLI
* Phantom Wallet

---

### Clone

```
git clone <repo-url>
cd <project>
```

---

### Install Dependencies

Frontend

```
npm install
```

Contracts

```
cd contracts
npm install
```

---

### Configure Devnet

```
solana config set --url devnet
solana airdrop 2
```

---

### Build Program

```
anchor build
```

---

### Run Tests

```
anchor test
```

The test suite validates escrow lifecycle, authorization rules, and failure cases.

---

### Run Frontend

```
npm run dev
```

Open:

```
http://localhost:5173
```

Connect Phantom on Devnet.

---

## Usage Guide

### Create Escrow

1. Connect wallet
2. Enter freelancer address
3. Specify amount
4. Set deadline
5. Confirm transaction

### Submit Work

1. Freelancer opens escrow
2. Provide metadata reference
3. Sign transaction

### Approve Release

1. Client reviews submission
2. Approves release
3. Funds transfer immediately

### Auto Release

After deadline:

* Anyone may trigger release transaction

---

## Security Properties

* Funds held by PDA, not frontend
* Signature-based authorization
* Immutable on-chain deadlines
* No backend custody
* Explicit failure handling for invalid actions

---

## Limitations

* Devnet only
* SOL-only escrows
* Single milestone per escrow
* UI polling (no indexing service)

---

## Future Extensions

* Multi-stage milestone escrows
* SPL token support
* Dispute signaling
* Reputation indexing
* Notification services
* Analytics dashboard

---

## Acknowledgment

Built using Anchor and Solana wallet adapter ecosystem components for demonstration of trustless payment enforcement primitives.
