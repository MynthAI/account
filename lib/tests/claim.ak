use aiken/transaction/value
use assist/addresses as addr
use mocks/mock_tx as mocks
use validations/claim.{can_claim}

// Check that the user has authorized with their stake key
test can_claim_test() {
  // Addresses
  // Note: the valid stake credentials on mocked tx are "#"face""
  let output_ref_address = addr.create_script_address(#"acab", #"face")
  let another_address = addr.create_address(#"face", #"acab")

  let ada_token = value.from_lovelace(100)

  // Inputs / Output
  let input_1 =
    mocks.test_input(address: output_ref_address, index: 0, token: ada_token)
  let input_2 =
    mocks.test_input(address: another_address, index: 1, token: ada_token)
  let output = mocks.test_output(address: output_ref_address, token: ada_token)

  let script_context = mocks.context([input_1, input_2], [output])

  can_claim(context: script_context)
}

// Check that the user cannot be authorized with an different / invalid stake key
test can_claim_test_1() {
  // Addresses
  // Note: the valid stake credentials on mocked tx are "#"face""
  let output_ref_address = addr.create_script_address(#"acab", #"acab")
  let another_address = addr.create_address(#"face", #"acab")

  let ada_token = value.from_lovelace(100)

  // Inputs / Output
  let input_1 =
    mocks.test_input(address: output_ref_address, index: 0, token: ada_token)
  let input_2 =
    mocks.test_input(address: another_address, index: 1, token: ada_token)
  let output = mocks.test_output(address: output_ref_address, token: ada_token)

  let script_context = mocks.context([input_1, input_2], [output])

  !can_claim(context: script_context)
}
