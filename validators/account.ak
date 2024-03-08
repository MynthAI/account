use aiken/transaction.{ScriptContext}
use validations/claim.{can_claim}
use validations/deposit.{can_deposit}

type Action {
  Claim
  Deposit
}

validator {
  fn validate(_datum, redeemer: Action, context: ScriptContext) {
    when redeemer is {
      Claim -> can_claim(context)
      Deposit -> can_deposit(context)
    }
  }
}
