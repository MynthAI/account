use aiken/dict
use aiken/interval.{Interval, IntervalBound, PositiveInfinity}
use aiken/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, ScriptContext, Spend,
  Transaction, TransactionId,
}
use aiken/transaction/credential.{Address}
use aiken/transaction/value.{Value}
use assist/credentials

pub const keyhash = #"010203040506"

pub fn test_out_ref() -> OutputReference {
  // This indicates that the UTXO to be spent is the output with the `output_index` == 0
  let out_ref =
    OutputReference {
      transaction_id: TransactionId { hash: #"acab" },
      output_index: 0,
    }
  out_ref
}

pub fn test_input(address: Address, index: Int, token: Value) -> Input {
  let input =
    Input {
      output_reference: OutputReference {
        transaction_id: TransactionId { hash: #"acab" },
        output_index: index,
      },
      output: Output {
        address,
        value: token,
        datum: NoDatum,
        reference_script: None,
      },
    }
  input
}

pub fn test_input_w_datum(
  address: Address,
  datum: ByteArray,
  index: Int,
  token: Value,
) -> Input {
  let input =
    Input {
      output_reference: OutputReference {
        transaction_id: TransactionId { hash: #"acab" },
        output_index: index,
      },
      output: Output {
        address,
        value: token,
        datum: InlineDatum(datum),
        reference_script: None,
      },
    }
  input
}

pub fn test_output(address: Address, token: Value) -> Output {
  let output =
    Output { address, value: token, datum: NoDatum, reference_script: None }
  output
}

pub fn test_output_w_datum(
  address: Address,
  datum: ByteArray,
  token: Value,
) -> Output {
  let output =
    Output {
      address,
      value: token,
      datum: InlineDatum(datum),
      reference_script: None,
    }
  output
}

pub fn context(inputs: List<Input>, outputs: List<Output>) -> ScriptContext {
  let placeholder_utxo = test_out_ref()
  ScriptContext {
    purpose: Spend(placeholder_utxo),
    transaction: tx_1(inputs, outputs),
  }
}

pub fn tx_1(inputs: List<Input>, outputs: List<Output>) -> Transaction {
  let sc = credentials.create_stake_credential(#"face")
  let withdrawal =
    dict.new()
      |> dict.insert(key: sc, value: 100, compare: fn(_, _) { Equal })
  let tx =
    Transaction {
      inputs,
      reference_inputs: [],
      outputs,
      fee: value.zero(),
      mint: value.from_asset(#"000000", #"00", -1) |> value.to_minted_value,
      certificates: [],
      withdrawals: withdrawal,
      validity_range: Interval {
        lower_bound: IntervalBound {
          bound_type: PositiveInfinity,
          is_inclusive: True,
        },
        upper_bound: IntervalBound {
          bound_type: PositiveInfinity,
          is_inclusive: True,
        },
      },
      extra_signatories: [keyhash],
      redeemers: dict.new(),
      datums: dict.new(),
      id: TransactionId { hash: #"" },
    }
  tx
}
