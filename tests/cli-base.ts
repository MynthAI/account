import anyTest, { TestFn } from "ava";
import build from "cli";
import { stub } from "sinon";

const NAME = "accounts";

type Result = {
  error: string;
  exitCode: number;
  output: string;
};

type Context = {
  parse: (args: string[]) => Promise<Result>;
};

const createMockWrite = () => {
  let output = "";
  const write = stub().callsFake((string: string) => {
    output += string;
  });

  return {
    output: () => output,
    write,
  };
};

const buildTest = (): TestFn<Context> => {
  const test = <TestFn<Context>>anyTest;

  test.beforeEach((t) => {
    const out = createMockWrite();
    const err = createMockWrite();
    const program = build();

    let exitPromiseResolve: (value: unknown) => void;
    program.exitOverride((err: { code: string }) => {
      if (err.code !== "commander.executeSubCommandAsync") {
        throw err;
      } else {
        exitPromiseResolve(err);
      }
    });

    program.configureOutput({
      writeOut: out.write,
      writeErr: err.write,
    });

    t.context.parse = async (commands: string[]) => {
      try {
        await program.parseAsync([...["node", NAME], ...commands]);
        await exitPromiseResolve;
      } catch (result) {
        let exitCode = 1;
        let message = "";

        if (typeof result === "object" && result !== null) {
          const errorResult = result as { exitCode?: number; message?: string };
          exitCode =
            errorResult.exitCode !== undefined ? errorResult.exitCode : 1;
          message = errorResult.message || "";
        }

        return {
          error: err.output(),
          exitCode: exitCode,
          output: !message || message.startsWith("(") ? out.output() : message,
        };
      }

      return {
        error: err.output(),
        exitCode: 0,
        output: out.output(),
      };
    };
  });

  return test;
};

export default buildTest;
export { Context };
