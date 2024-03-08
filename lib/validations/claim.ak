use aiken/dict
use aiken/list
use aiken/transaction.{Input, Output, ScriptContext, Transaction}
use aiken/transaction/credential.{Address}
use common/addresses.{get_script}

// Check that the user has authorized with their stake key
pub fn can_claim(context: ScriptContext) {
  let script_input = get_script(context)
  expect Some(owner_key) = script_input.output.address.stake_credential

  let withdrawals = context.transaction.withdrawals
  expect Some(signed_key) =
    withdrawals
      |> dict.keys
      |> list.at(0)
  dict.size(withdrawals) == 1 && owner_key == signed_key
}
