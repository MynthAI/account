import build from "./cli-base";

const test = build();

test("cli shows help", async (t) => {
  const { exitCode, output } = await t.context.parse(["help"]);
  t.is(exitCode, 0);
  t.true(output.includes("Usage"), output);
});

test("cli shows error for unknown command", async (t) => {
  const { exitCode, output } = await t.context.parse(["error"]);
  t.is(exitCode, 1);
  t.true(output.includes("unknown command"), output);
});
