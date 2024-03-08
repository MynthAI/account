use aiken/transaction.{ScriptContext, Spend}

// Obtain the expected input by reference.
pub fn get_script(context: ScriptContext) {
  expect Spend(reference) = context.purpose
  expect Some(script_input) =
    transaction.find_input(context.transaction.inputs, reference)
  script_input
}
