use aiken/dict
use aiken/transaction/value
use assist/addresses
use mocks/mock_tx as mocks
use validations/deposit.{get_balance}

// Expect returns a balance with the sum of the outputs pointing to the address
test get_balance_test() {
  // Addresses
  let address_w_funds = addresses.create_address(#"face", #"")

  let cnt_token_1 = value.from_asset(#"acab", #"beef", 40)
  let cnt_token_2 = value.from_asset(#"acab", #"beef", 80)
  let cnt_token_3 = value.from_asset(#"acab", #"face", 50)

  // Inputs / Outputs
  let output_2 = mocks.test_output(address: address_w_funds, token: cnt_token_1)
  let output_3 = mocks.test_output(address: address_w_funds, token: cnt_token_2)
  let output_4 = mocks.test_output(address: address_w_funds, token: cnt_token_3)

  let balance = get_balance(utxos: [output_2, output_3, output_4])

  // Expected a Dict of CNT tokens with the correct sum of balances of each token.
  dict.to_list(balance) == [(#"acabbeef", 120), (#"acabface", 50)]
}
