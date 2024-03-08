# Mynth Account

This repository hosts Cardano smart contracts for Mynth Accounts. This
includes creating snapshots of Mynth Genesis holders, reward
calculation, and reward distribution.

## Prerequisites

  - [node](https://nodejs.org/download/release/v18.18.2/) (\>=18.18)
  - [Aiken](https://aiken-lang.org/installation-instructions)

## Usage

The `npx accounts` CLI provides an interface for creating snapshots,
claiming rewards, and distributing rewards.

### Creating a Snapshot

To create a snapshot and calculate how many rewards each user should
receive, run: `npx accounts rewards calculate`

### Distributing Rewards

To distribute rewards for the latest snapshot, run: `npx accounts
rewards distribute`

This will request for the seed phrase of the wallet containing the
rewards to distribute.

## Testing

To run Aiken unit tests:

``` sh
npm run test:aiken
```

To run integration tests:

``` sh
npm run test
```

## Setting Up Vault Secrets

This project utilizes Vault for secure storage of secrets. To set it up
on your computer, follow the steps provided on the [Local
Vault](https://github.com/MynthAI/local-vault) page. Afterward, proceed
to install [Vault Helper](https://github.com/MynthAI/vault-helper).

To view the list of secrets that require setup, execute the command
below:

``` bash
vault-helper template secrets
```

To set up the secrets, use `vault-cli set -p <secret-name>`. Reach out
to a team member to obtain the values for each secret.
