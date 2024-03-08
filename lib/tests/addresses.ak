use aiken/transaction/value
use assist/addresses as addr
use common/addresses.{get_script}
use mocks/mock_tx as mocks

// Check that the UTXO to be spent is the input specified in the `output_reference`
// in this case this TX has the `output_reference` with the `output_index` == 0
test get_script_test() {
  // Addresses
  let output_ref_address = addr.create_address(#"face", #"")
  let another_address = addr.create_address(#"acab", #"")

  let ada_token = value.from_lovelace(100)

  // Inputs / Outputs
  let input_1 =
    mocks.test_input(address: output_ref_address, index: 0, token: ada_token)
  let input_2 =
    mocks.test_input(address: another_address, index: 1, token: ada_token)
  let output = mocks.test_output(address: output_ref_address, token: ada_token)

  let script_context = mocks.context([input_1, input_2], [output])

  let address_found = get_script(context: script_context)

  address_found == input_1
}
