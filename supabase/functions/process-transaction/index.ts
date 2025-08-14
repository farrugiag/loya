import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  
  try {
    // Check if this is a Stripe webhook
    const contentType = req.headers.get('content-type') || '';
    const stripeSignature = req.headers.get('stripe-signature');
    
    if (stripeSignature && contentType.includes('application/json')) {
      // Handle Stripe webhook
      const body = await req.text();
      const event = JSON.parse(body);
      
      // Handle different webhook event types
      switch (event.type) {
        case 'account.updated':
          // Handle Stripe Connect account updates
          const account = event.data.object;
          if (account.details_submitted) {
            const { error } = await supabase
              .from('businesses')
              .update({ 
                stripe_details_submitted: true,
                stripe_charges_enabled: account.charges_enabled,
                stripe_payouts_enabled: account.payouts_enabled
              })
              .eq('stripe_id', account.id);

            if (error) {
              console.error('Failed to update business Stripe status:', error);
            } else {
              console.log('Updated business Stripe status for account:', account.id);
            }
          }
          return new Response(JSON.stringify({ received: true, processed: 'account_updated' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });

        case 'payment_intent.succeeded':
          // Process payment with cashback and referral logic
          break;

        case 'payment_intent.payment_failed':
          // Handle failed payments
          const failedPayment = event.data.object;
          console.log('Payment failed:', failedPayment.id);
          
          // Update transaction status to failed
          const { error: failError } = await supabase
            .from('transactions')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_payment_intent_id', failedPayment.id);

          if (failError) {
            console.error('Failed to update failed transaction:', failError);
          }
          
          return new Response(JSON.stringify({ received: true, processed: 'payment_failed' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });

        default:
          // Return success for unhandled event types
          return new Response(JSON.stringify({ received: true, skipped: 'unhandled_event' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });
      }

      // Only continue if this is a payment_intent.succeeded event
      if (event.type !== 'payment_intent.succeeded') {
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      }
      
      const paymentData = event.data.object;
      const paymentId = paymentData.id;
      
      // Validate required metadata
      if (!paymentData.metadata?.businessId || !paymentData.metadata?.userId) {
        return new Response(JSON.stringify({ error: 'Missing required metadata' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const { businessId, userId } = paymentData.metadata;
      const amount = paymentData.amount / 100; // Convert from cents
      const cashback = amount * 0.05; // 5% cashback
      
      // Check if this payment intent has already been processed
      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('stripe_payment_intent_id', paymentId)
        .maybeSingle();
      
      if (existingTransaction) {
        return new Response(JSON.stringify({ received: true, skipped: 'already_processed' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      }
      
      // Start database transaction
      const { data: user } = await supabase
        .from('users')
        .select('referred_by')
        .eq('id', userId)
        .single();
      
      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      let referral_reward = 0;
      let referrer_id = null;
      
      // Process referral if exists
      if (user.referred_by) {
        referrer_id = user.referred_by;
        referral_reward = amount * 0.01; // 1% referral reward
        
        // Get or create referrer wallet
        const { data: refWallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', referrer_id)
          .eq('business_id', businessId)
          .maybeSingle();
        
        if (refWallet) {
          // Update existing referrer wallet
          await supabase
            .from('wallets')
            .update({
              balance_from_referrals: refWallet.balance_from_referrals + referral_reward
            })
            .eq('id', refWallet.id);
        } else {
          // Create new referrer wallet
          await supabase
            .from('wallets')
            .insert([{
              user_id: referrer_id,
              business_id: businessId,
              balance: 0,
              balance_from_referrals: referral_reward
            }]);
        }
      }
      
      // Get or create user's wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('business_id', businessId)
        .maybeSingle();
      
      let wallet_id;
      
      if (!wallet) {
        // Create new user wallet
        const { data: newWallet } = await supabase
          .from('wallets')
          .insert([{
            user_id: userId,
            business_id: businessId,
            balance: cashback,
            balance_from_referrals: 0
          }])
          .select()
          .single();
        
        wallet_id = newWallet.id;
      } else {
        // Update existing user wallet
        wallet_id = wallet.id;
        await supabase
          .from('wallets')
          .update({
            balance: wallet.balance + cashback
          })
          .eq('id', wallet_id);
      }
      
      // Insert transaction record
      await supabase
        .from('transactions')
        .insert([{
          user_id: userId,
          business_id: businessId,
          wallet_id,
          order_id: paymentId,
          amount,
          cashback_earned: cashback,
          referrer_id,
          referral_reward,
          stripe_payment_intent_id: paymentId
        }]);
      
      return new Response(JSON.stringify({ received: true, processed: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
      
    } else {
      // Handle manual transaction processing
      const { user_id, business_id, amount, order_id } = await req.json();
      
      if (!user_id || !business_id || !amount || !order_id) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      const cashback = amount * 0.05;
      
      // Check for referral
      const { data: user } = await supabase
        .from('users')
        .select('referred_by')
        .eq('id', user_id)
        .single();
      
      let referral_reward = 0;
      let referrer_id = null;
      
      if (user?.referred_by) {
        referrer_id = user.referred_by;
        referral_reward = amount * 0.01;
        
        // Get or create referrer wallet
        const { data: refWallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', referrer_id)
          .eq('business_id', business_id)
          .maybeSingle();
        
        if (refWallet) {
          await supabase
            .from('wallets')
            .update({
              balance_from_referrals: refWallet.balance_from_referrals + referral_reward
            })
            .eq('id', refWallet.id);
        } else {
          await supabase
            .from('wallets')
            .insert([{
              user_id: referrer_id,
              business_id,
              balance: 0,
              balance_from_referrals: referral_reward
            }]);
        }
      }
      
      // Get or create user's wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user_id)
        .eq('business_id', business_id)
        .maybeSingle();
      
      let wallet_id;
      
      if (!wallet) {
        const { data: newWallet } = await supabase
          .from('wallets')
          .insert([{
            user_id,
            business_id,
            balance: cashback,
            balance_from_referrals: 0
          }])
          .select()
          .single();
        
        wallet_id = newWallet.id;
      } else {
        wallet_id = wallet.id;
        await supabase
          .from('wallets')
          .update({
            balance: wallet.balance + cashback
          })
          .eq('id', wallet_id);
      }
      
      // Insert transaction
      await supabase
        .from('transactions')
        .insert([{
          user_id,
          business_id,
          wallet_id,
          order_id,
          amount,
          cashback_earned: cashback,
          referrer_id,
          referral_reward
        }]);
      
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}); 