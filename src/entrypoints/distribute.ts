import config from "config";
import { distributeRewardsToAllHolders } from "distributeRewards";
import { loadVaultConfig, overrideConfig } from "mynth-helper";

declare module "config" {
  interface IUtil {
    getCustomEnvVars(
      configPath: string,
      args: string[]
    ): Record<string, string | object>;
  }
}

const run = async () => {
  await loadVaultConfig();
  overrideConfig(config.util.getCustomEnvVars("config", ["yml"]));
  const result = await distributeRewardsToAllHolders(
    config.get<string>("wallets.distributor"),
    true
  );

  if (!result.ok) {
    console.error(result.error);
    return 1;
  }

  return 0;
};

run().then(process.exit);
