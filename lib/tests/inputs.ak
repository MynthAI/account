use aiken/transaction/value
use assist/addresses as addr
use mocks/mock_tx as mocks
use validations/deposit.{get_input_utxos}

// If a list of inputs is provided and none of them points to an addres then it returns a empty list.
test get_input_utxos_test() {
  let address_1 = addr.create_address(#"acab", #"")
  let address_2 = addr.create_address(#"face", #"")

  let input =
    mocks.test_input(
      address: address_1,
      index: 0,
      token: value.from_lovelace(100),
    )

  let input_found = get_input_utxos([input], address_2)

  input_found == []
}

// If a list of inputs is provided and one of them points to an address and has an output, then it returns the expected input.
test get_input_utxos_test_1() {
  let address = addr.create_address(#"acab", #"")

  let input =
    mocks.test_input(
      address: address,
      index: 0,
      token: value.from_lovelace(100),
    )
  let output =
    mocks.test_output(address: address, token: value.from_lovelace(100))

  let input_found = get_input_utxos([input], address)

  input_found == [output]
}
