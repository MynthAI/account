import build from "cli";
import config from "config";
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
  build().parseAsync(process.argv);
};

run();
