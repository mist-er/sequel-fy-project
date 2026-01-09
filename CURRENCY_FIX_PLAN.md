# Currency Fix Implementation Plan

The error "Currency not supported by merchant" is a direct response from Paystack indicating that your merchant account is not enabled for the currency being requested (**GHS**).

## 1. Backend Changes (Completed)
- Modified `paymentController.js` to explicitly send `GHS` by default.
- Added environment variable support: `PAYSTACK_CURRENCY`.
- Improved error handling to provide specific guidance when this error occurs.

## 2. Steps to Resolve the Account Issue
The merchant account being used (based on your Secret Key) is likely a **Nigerian** account or a **test account** not yet enabled for Ghana Cedis.

### Option A: Use a Ghanaian Paystack Account (Recommended)
1. Ensure your Paystack account was created at [paystack.com/gh](https://paystack.com/gh).
2. Go to your **Paystack Dashboard -> Settings -> API Keys & Webhooks**.
3. Copy the **Secret Key** (it should start with `sk_test_` or `sk_live_`).
4. Ensure this key is in your backend `.env` file for `PAYSTACK_SECRET_KEY`.

### Option B: Temporarily Use NGN for Testing (If you only have a Nigerian account)
If you cannot get a Ghanaian account right now but want to test the payment flow, you can change the currency in your `.env` file:
```env
PAYSTACK_CURRENCY=NGN
```

## 3. Verification
Once you've updated your account or `.env`, the system will:
1. Initialize the transaction using the specified currency.
2. Calculate the amount correctly (Amount * 100 for subunits).
3. Display clear error messages if the gateway still rejects the currency.

---
**Status**: Backend code is ready. Please verify your Paystack account region!
