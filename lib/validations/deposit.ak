use aiken/bytearray
use aiken/dict.{Dict}
use aiken/list
use aiken/transaction.{Input, Output, ScriptContext, Transaction}
use aiken/transaction/credential.{Address}
use aiken/transaction/value
use common/addresses.{get_script}

pub fn get_balance(utxos: List<Output>) -> Dict<ByteArray, Int> {
  list.flat_map(
    utxos,
    fn(output) {
      list.map(
        output.value |> value.flatten,
        fn(value) { (bytearray.concat(value.1st, value.2nd), value.3rd) },
      )
    },
  )
    |> list.foldl(
         dict.new(),
         fn(token, acc) {
           dict.union_with(
             acc,
             dict.new()
               |> dict.insert(
                    key: token.1st,
                    value: token.2nd,
                    compare: bytearray.compare,
                  ),
             fn(_, balance, output) { Some(balance + output) },
             bytearray.compare,
           )
         },
       )
}

pub fn get_input_utxos(inputs: List<Input>, script: Address) {
  list.filter_map(
    inputs,
    fn(input) {
      if input.output.address == script {
        Some(input.output)
      } else {
        None
      }
    },
  )
}

pub fn get_output_utxos(outputs: List<Output>, script: Address) {
  list.filter(outputs, fn(output) { output.address == script })
}

// Check that datum is the same
// Check that destination is the same
// Check that balance increased
pub fn can_deposit(context: ScriptContext) {
  let script_input = get_script(context)
  let script = script_input.output.address

  let starting_balance =
    context.transaction.inputs
      |> get_input_utxos(script)
      |> get_balance

  let outputs =
    context.transaction.outputs
      |> get_output_utxos(script)
  let ending_balance = get_balance(outputs)

  let is_balance_same_or_greater =
    dict.union_with(
      ending_balance,
      starting_balance,
      fn(_, output, input) { Some(output - input) },
      bytearray.compare,
    )
      |> dict.values()
      |> list.all(fn(amount) { amount >= 0 })

  expect Some(output) = list.at(outputs, 0)
  list.length(outputs) == 1 && output.datum == script_input.output.datum && is_balance_same_or_greater
}
