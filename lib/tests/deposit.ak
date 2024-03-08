use aiken/transaction/value
use assist/addresses as addr
use mocks/mock_tx as mocks
use validations/deposit.{can_deposit}

// Validate that users can send funds to smart contract
test can_deposit_test() {
  // Addresses
  let address = addr.create_address(#"acab", #"")

  let ada_token = value.from_lovelace(100)

  // Inputs / Output
  let input = mocks.test_input(address: address, index: 0, token: ada_token)
  let output = mocks.test_output(address: address, token: ada_token)

  let script_context = mocks.context([input], [output])

  can_deposit(script_context)
}

// Validate that users cannot send funds to smart contract if try to withdraw locked ADA funds
test can_deposit_test_1() {
  // Addresses
  let address = addr.create_address(#"acab", #"")

  let ada_token = value.from_lovelace(100)

  // Inputs / Output
  let input = mocks.test_input(address: address, index: 0, token: ada_token)
  let output =
    mocks.test_output(address: address, token: value.from_lovelace(50))

  let script_context = mocks.context([input], [output])

  !can_deposit(script_context)
}

// Validate that users cannot send funds to smart contract if destination is not the same
test can_deposit_test_2() {
  // Addresses
  let address = addr.create_address(#"acab", #"")

  let ada_token = value.from_lovelace(100)

  // Inputs / Output
  let input = mocks.test_input(address: address, index: 0, token: ada_token)
  let output =
    mocks.test_output_w_datum(
      address: address,
      datum: #"acabbeeffacecafe",
      token: ada_token,
    )

  let script_context = mocks.context([input], [output])

  !can_deposit(script_context)
}

// Validate that users can send funds to smart contract if the datum of input & output is the same
test can_deposit_test_3() {
  // Addresses
  let address = addr.create_address(#"acab", #"")

  let ada_token = value.from_lovelace(100)

  // Inputs / Output
  let input =
    mocks.test_input_w_datum(
      address: address,
      datum: #"acabbeeffacecafe",
      index: 0,
      token: ada_token,
    )
  let output =
    mocks.test_output_w_datum(
      address: address,
      datum: #"acabbeeffacecafe",
      token: ada_token,
    )

  let script_context = mocks.context([input], [output])

  can_deposit(script_context)
}
