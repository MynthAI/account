use aiken/transaction/value
use assist/addresses as addr
use mocks/mock_tx as mocks
use validations/deposit.{get_output_utxos}

// If a list of outputs is passed but none of the outputs points to an addres
// it returns an empty list
test get_output_utxos_test() {
  let address_1 = addr.create_address(#"face", #"")
  let address_2 = addr.create_address(#"acab", #"")

  let output =
    mocks.test_output(address: address_1, token: value.from_lovelace(100))

  let output_found = get_output_utxos([output], address_2)

  output_found == []
}

// If a list of outputs is passed and one points to a address and contains a valid output
// it returns a expected output
test get_output_utxos_test_2() {
  let address = addr.create_address(#"acab", #"")

  let output =
    mocks.test_output(address: address, token: value.from_lovelace(100))

  let output_found = get_output_utxos([output], address)

  output_found == [output]
}
