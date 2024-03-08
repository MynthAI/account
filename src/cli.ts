import { claim } from "claim";
import { Command } from "commander";
import { userDeploy } from "deploy";
import { deposit } from "deposit";
import { distributeRewardsToAllHolders } from "distributeRewards";
import { packageJson } from "mynth-helper";
import { getSeed, isPaymentAddress, parseAmount } from "utils/functions";
import { calcaulateRewardsForAccountHolders } from "utils/rewardCalculation";

const build = () => {
  const program = new Command();

  program
    .name("accounts")
    .version(packageJson.version)
    .description(packageJson.description);

  program
    .command("deploy")
    .description("Deploys the smart contract to the blockchain")
    .argument("[seed]", "The seed phrase of the funding wallet")
    .action(async (seed?: string) => {
      const result = await userDeploy(await getSeed(program, seed));
      if (!result.ok) program.error(result.error);
    });

  program
    .command("deposit")
    .description("Deposits MNT into a user's account")
    .argument("<stake-address>", "The user's stake address")
    .argument("<amount>", "The amount of MNT to deposit")
    .argument("[seed]", "The seed phrase of the funding wallet")
    .option(
      "-s, --submit",
      "Set to submit the mint transaction to the blockchain. If not provided, then a dry-run is performed."
    )
    .action(
      async (
        stakeAddress: string,
        amount: string,
        seed: string,
        options: object
      ) => {
        deposit(
          await getSeed(program, seed),
          stakeAddress,
          parseAmount(program, amount),
          "submit" in options
        );
      }
    );

  program
    .command("claim")
    .description("Claims available MNT rewards from a user's account")
    .argument("<address>", "The user's address")
    .action((address: string) => {
      if (!isPaymentAddress(address))
        program.error("Invalid payment address provided");

      claim(address);
    });

  const rewards = program
    .command("rewards")
    .description("Calculate and distribute rewards");
  rewards
    .command("calculate")
    .description("Calculate rewards to distribute")
    .action(calcaulateRewardsForAccountHolders);

  rewards
    .command("distribute")
    .description("Distributes rewards into registered mynth accounts")
    .argument("[seed]", "The seed phrase of the funding wallet")
    .option(
      "-s, --submit",
      "Set to submit the reward transactions to the blockchain. If not provided, then a dry-run is performed."
    )
    .action(async (seed: string, options: object) => {
      distributeRewardsToAllHolders(
        await getSeed(program, seed),
        "submit" in options
      );
    });

  return program;
};

export default build;
