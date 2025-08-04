# 🔧 Stripe Connect Troubleshooting Guide

## 🚨 Issue: Account Not Appearing & Dashboard Loop

**Problem:** After completing Stripe onboarding, the account doesn't appear in Stripe Dashboard and the business dashboard keeps showing "Connect Stripe" button.

---

## 🔍 Root Cause Analysis

The issue is caused by **missing database fields** and **webhook configuration problems**:

1. **Missing Database Fields**: The `businesses` table is missing required Stripe fields
2. **Webhook Not Configured**: The `account.updated` events aren't being processed
3. **Status Check Logic**: Dashboard can't properly verify Stripe account status

---

## ✅ Step-by-Step Solution

### Step 1: Update Database Schema

**Run this SQL in your Supabase Dashboard:**

```sql
-- Add missing Stripe fields to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;

-- Create index for stripe_id lookups
CREATE INDEX IF NOT EXISTS idx_businesses_stripe_id ON businesses(stripe_id);
```

### Step 2: Set Up Webhook Forwarding

**In your terminal, run these commands:**

```bash
# 1. Login to Stripe CLI (if not already done)
.\stripe.exe login

# 2. Start webhook forwarding (in a new terminal window)
.\stripe.exe listen --forward-to localhost:3000/api/webhook

# 3. Copy the webhook secret and add to your .env.local:
# STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Test Webhook Events

**Test the account.updated event:**

```bash
.\stripe.exe trigger account.updated
```

### Step 4: Manual Account Status Check

**If webhooks aren't working, manually check your account:**

1. Go to your business dashboard
2. Open browser developer tools (F12)
3. In the Console tab, run:

```javascript
// Replace YOUR_BUSINESS_ID with your actual business ID
fetch('/api/account-status?accountId=YOUR_STRIPE_ACCOUNT_ID')
  .then(res => res.json())
  .then(data => console.log('Stripe Status:', data))
  .catch(err => console.error('Error:', err));
```

### Step 5: Force Status Update

**If the account exists but status is wrong, manually update:**

```sql
-- Replace 'acct_xxxxxxxxxxxxx' with your actual Stripe account ID
UPDATE businesses 
SET stripe_details_submitted = true,
    stripe_charges_enabled = true,
    stripe_payouts_enabled = true
WHERE stripe_id = 'acct_xxxxxxxxxxxxx';
```

---

## 🔍 Debugging Steps

### Check 1: Database Fields Exist

```sql
-- Run this in Supabase SQL editor
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND column_name LIKE 'stripe%';
```

**Expected Result:**
```
stripe_id | text
stripe_details_submitted | boolean
stripe_charges_enabled | boolean
stripe_payouts_enabled | boolean
```

### Check 2: Business Record Has Stripe ID

```sql
-- Check if your business has a Stripe account ID
SELECT id, email, business_name, stripe_id, stripe_details_submitted
FROM businesses 
WHERE id = 'YOUR_BUSINESS_ID';
```

### Check 3: Stripe Account Exists

**In Stripe Dashboard:**
1. Go to Connect → Accounts
2. Look for your account ID
3. Check if it shows as "Complete" or "Incomplete"

### Check 4: Webhook Events

**Check if webhook events are being received:**

```bash
# List recent webhook events
.\stripe.exe events list --limit 10
```

---

## 🚨 Common Issues & Fixes

### Issue 1: "Business has not completed Stripe onboarding"

**Cause:** `stripe_details_submitted` is false in database

**Fix:**
```sql
UPDATE businesses 
SET stripe_details_submitted = true 
WHERE id = 'YOUR_BUSINESS_ID';
```

### Issue 2: Webhook not receiving events

**Cause:** Webhook forwarding not set up or wrong secret

**Fix:**
1. Restart webhook forwarding: `.\stripe.exe listen --forward-to localhost:3000/api/webhook`
2. Verify webhook secret in `.env.local`
3. Check server logs for webhook errors

### Issue 3: Account exists in Stripe but not in database

**Cause:** Database update failed during account creation

**Fix:**
1. Get account ID from Stripe Dashboard
2. Manually update database:
```sql
UPDATE businesses 
SET stripe_id = 'acct_xxxxxxxxxxxxx',
    stripe_details_submitted = true,
    stripe_charges_enabled = true,
    stripe_payouts_enabled = true
WHERE id = 'YOUR_BUSINESS_ID';
```

### Issue 4: Dashboard still shows "Connect Stripe" after fixes

**Cause:** Browser cache or React state not updated

**Fix:**
1. Hard refresh the page (Ctrl+F5)
2. Clear browser cache
3. Check browser console for errors

---

## 🧪 Testing Checklist

After applying fixes:

- [ ] Database schema updated with Stripe fields
- [ ] Webhook forwarding active and receiving events
- [ ] Business record has valid `stripe_id`
- [ ] `stripe_details_submitted` is `true`
- [ ] `stripe_charges_enabled` is `true`
- [ ] `stripe_payouts_enabled` is `true`
- [ ] Dashboard shows "Stripe account is connected"
- [ ] Account appears in Stripe Dashboard
- [ ] Can create products and process payments

---

## 📞 Getting Help

If issues persist:

1. **Check server logs** for error messages
2. **Verify environment variables** are set correctly
3. **Test with a fresh business account**
4. **Check Stripe Dashboard** for account status
5. **Review webhook event logs** in Stripe Dashboard

---

## 🔄 Quick Reset

If you want to start fresh:

1. **Delete the business record:**
```sql
DELETE FROM businesses WHERE id = 'YOUR_BUSINESS_ID';
```

2. **Recreate business account** through signup flow
3. **Complete Stripe onboarding** again
4. **Verify webhook events** are processed

---

**Last Updated:** [Current Date]  
**Status:** ✅ Ready for testing 