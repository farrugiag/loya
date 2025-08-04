import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'account.updated':
        const account = event.data.object as Stripe.Account
        
        // Update business record when Stripe account is updated
        if (account.details_submitted) {
          const { error } = await supabase
            .from('businesses')
            .update({ 
              stripe_details_submitted: true,
              stripe_charges_enabled: account.charges_enabled,
              stripe_payouts_enabled: account.payouts_enabled
            })
            .eq('stripe_id', account.id)

          if (error) {
            console.error('Failed to update business Stripe status:', error)
          } else {
            console.log('Updated business Stripe status for account:', account.id)
          }
        }
        break

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment succeeded:', paymentIntent.id)
        
        // Handle saving payment method if requested
        if (paymentIntent.metadata?.savePaymentMethod === 'true' && paymentIntent.payment_method) {
          try {
            // Attach the payment method to the customer
            await stripe.paymentMethods.attach(paymentIntent.payment_method as string, {
              customer: paymentIntent.customer as string,
            })
            
            // Set as default payment method
            await stripe.customers.update(paymentIntent.customer as string, {
              invoice_settings: {
                default_payment_method: paymentIntent.payment_method as string,
              },
            })
            
            console.log('Payment method saved for customer:', paymentIntent.customer)
          } catch (error) {
            console.error('Failed to save payment method:', error)
          }
        }

        // Update transaction status and calculate cashback
        if (paymentIntent.metadata?.businessId && paymentIntent.metadata?.userId) {
          const amount = paymentIntent.amount / 100 // Convert from cents
          const cashbackAmount = amount * 0.05 // 5% cashback
          
          // Update transaction status
          const { error: updateError } = await supabase
            .from('transactions')
            .update({
              status: 'completed',
              cashback_amount: cashbackAmount,
              updated_at: new Date().toISOString()
            })
            .eq('stripe_payment_intent_id', paymentIntent.id)

          if (updateError) {
            console.error('Failed to update transaction:', updateError)
          } else {
            console.log('Updated transaction for payment:', paymentIntent.id)
          }

          // Create or update user wallet with cashback
          const { data: existingWallet } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', paymentIntent.metadata.userId)
            .single()

          if (existingWallet) {
            // Update existing wallet
            const { error: walletError } = await supabase
              .from('wallets')
              .update({
                balance: existingWallet.balance + cashbackAmount,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingWallet.id)

            if (walletError) {
              console.error('Failed to update wallet:', walletError)
            } else {
              console.log('Updated wallet with cashback for user:', paymentIntent.metadata.userId)
            }
          } else {
            // Create new wallet
            const { error: walletError } = await supabase
              .from('wallets')
              .insert({
                user_id: paymentIntent.metadata.userId,
                balance: cashbackAmount,
                currency: 'usd',
                status: 'active'
              })

            if (walletError) {
              console.error('Failed to create wallet:', walletError)
            } else {
              console.log('Created new wallet with cashback for user:', paymentIntent.metadata.userId)
            }
          }
        }
        break

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent
        console.log('Payment failed:', failedPayment.id)
        
        // Update transaction status to failed
        const { error: failError } = await supabase
          .from('transactions')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', failedPayment.id)

        if (failError) {
          console.error('Failed to update failed transaction:', failError)
        }
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response('Webhook handler failed', { status: 500 })
  }
}) 