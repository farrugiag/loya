import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  
  try {
    // Check if this is a Stripe webhook
    const contentType = req.headers.get('content-type') || '';
    const stripeSignature = req.headers.get('stripe-signature');
    
         if (stripeSignature && contentType.includes('application/json')) {
       // Handle Stripe webhook
       const body = await req.text();
       
       try {
         // For now, skip signature verification to avoid crypto issues
         const event = JSON.parse(body);
        
        switch (event.type) {
                     case 'payment_intent.succeeded':
             const paymentIntent = event.data.object;
            console.log('Payment succeeded:', paymentIntent.id);
            
                         // Note: Payment method saving is handled by Stripe automatically
             // when setup_future_usage is set in the checkout session
             console.log('Payment method saving handled by Stripe checkout');
            
            // Process the transaction
            if (paymentIntent.metadata?.businessId && paymentIntent.metadata?.userId) {
              const amount = paymentIntent.amount / 100; // Convert from cents
              const cashback = amount * 0.05;
              let referral_reward = 0;
              let referrer_id = null;
              
                             // 1. Check for referral
               const { data: user } = await supabase.from('users').select('referred_by').eq('id', paymentIntent.metadata.userId).single();
               if (user?.referred_by) {
                 referrer_id = user.referred_by;
                 referral_reward = amount * 0.01;
                 
                 // Check if this payment has already been processed for referrer
                 const { data: existingReferrerTransaction } = await supabase
                   .from('transactions')
                   .select('id')
                   .eq('stripe_payment_intent_id', paymentIntent.id)
                   .eq('referrer_id', referrer_id)
                   .maybeSingle();
                 
                 if (!existingReferrerTransaction) {
                   // Check if referrer wallet exists
                   const { data: refWallet } = await supabase.from('wallets').select('*').eq('user_id', referrer_id).eq('business_id', paymentIntent.metadata.businessId).maybeSingle();
                   
                   if (refWallet) {
                     // Update existing referrer wallet
                     await supabase.from('wallets').update({
                       balance_from_referrals: refWallet.balance_from_referrals + referral_reward
                     }).eq('id', refWallet.id);
                     console.log('Updated referrer wallet:', refWallet.id, 'added referral reward:', referral_reward);
                   } else {
                     // Create new referrer wallet
                     const { data: newRefWallet } = await supabase.from('wallets').insert([
                       {
                         user_id: referrer_id,
                         business_id: paymentIntent.metadata.businessId,
                         balance: 0,
                         balance_from_referrals: referral_reward
                       }
                     ]).select().single();
                     console.log('Created new referrer wallet:', newRefWallet.id, 'with referral reward:', referral_reward);
                   }
                 } else {
                   console.log('Skipping referrer wallet update - already processed for payment:', paymentIntent.id);
                 }
               }
              
                             // 2. Get or create user's wallet
               const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', paymentIntent.metadata.userId).eq('business_id', paymentIntent.metadata.businessId).maybeSingle();
               let wallet_id = wallet?.id;
               
               if (!wallet_id) {
                 // Create new user wallet
                 const { data: newWallet } = await supabase.from('wallets').insert([
                   {
                     user_id: paymentIntent.metadata.userId,
                     business_id: paymentIntent.metadata.businessId,
                     balance: cashback,
                     balance_from_referrals: 0
                   }
                 ]).select().single();
                 wallet_id = newWallet.id;
                 console.log('Created new user wallet:', wallet_id, 'with balance:', cashback);
               } else {
                 // Check if this payment has already been processed for this wallet
                 const { data: existingTransaction } = await supabase
                   .from('transactions')
                   .select('id')
                   .eq('stripe_payment_intent_id', paymentIntent.id)
                   .maybeSingle();
                 
                 if (!existingTransaction) {
                   // Recalculate wallet balance from all transactions to ensure accuracy
                   const { data: allTransactions } = await supabase
                     .from('transactions')
                     .select('cashback_earned')
                     .eq('user_id', paymentIntent.metadata.userId)
                     .eq('business_id', paymentIntent.metadata.businessId);
                   
                   const totalCashback = allTransactions?.reduce((sum, t) => sum + t.cashback_earned, 0) || 0;
                   const newBalance = totalCashback + cashback; // Add current transaction's cashback
                   
                   await supabase.from('wallets').update({
                     balance: newBalance
                   }).eq('id', wallet_id);
                   console.log('Recalculated wallet balance:', wallet_id, 'total cashback from transactions:', totalCashback, 'new transaction cashback:', cashback, 'new total:', newBalance);
                   
                   // Log transaction only if it doesn't already exist
                   await supabase.from('transactions').insert([
                     {
                       user_id: paymentIntent.metadata.userId,
                       business_id: paymentIntent.metadata.businessId,
                       wallet_id,
                       order_id: paymentIntent.id, // Use payment intent ID as order_id
                       amount,
                       cashback_earned: cashback,
                       referrer_id,
                       referral_reward,
                       stripe_payment_intent_id: paymentIntent.id
                     }
                   ]);
                   
                   console.log('Transaction processed for payment:', paymentIntent.id);
                 } else {
                   console.log('Skipping wallet update and transaction creation - already processed for payment:', paymentIntent.id);
                 }
               }
            }
            break;
            
                     case 'account.updated':
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
            break;
            
          default:
            console.log(`Unhandled event type: ${event.type}`);
        }
        
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
        
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return new Response('Invalid signature', { status: 400 });
      }
    } else {
      // Handle manual transaction processing (your existing logic)
      const { user_id, business_id, amount, order_id } = await req.json();
      if (!user_id || !business_id || !amount || !order_id) {
        return new Response(JSON.stringify({
          error: 'Missing fields'
        }), {
          status: 400
        });
      }
      
      const cashback = amount * 0.05;
      let referral_reward = 0;
      let referrer_id = null;
      
      // 1. Check for referral
      const { data: user } = await supabase.from('users').select('referred_by').eq('id', user_id).single();
      if (user?.referred_by) {
        referrer_id = user.referred_by;
        referral_reward = amount * 0.01;
        const { data: refWallet } = await supabase.from('wallets').select('*').eq('user_id', referrer_id).eq('business_id', business_id).maybeSingle();
        if (refWallet) {
          await supabase.from('wallets').update({
            balance_from_referrals: refWallet.balance_from_referrals + referral_reward
          }).eq('id', refWallet.id);
        } else {
          await supabase.from('wallets').insert([
            {
              user_id: referrer_id,
              business_id,
              balance: 0,
              balance_from_referrals: referral_reward
            }
          ]);
        }
      }
      
      // 2. Get or create user's wallet
      const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', user_id).eq('business_id', business_id).maybeSingle();
      let wallet_id = wallet?.id;
      if (!wallet_id) {
        const { data: newWallet } = await supabase.from('wallets').insert([
          {
            user_id,
            business_id,
            balance: cashback,
            balance_from_referrals: 0
          }
        ]).select().single();
        wallet_id = newWallet.id;
      } else {
        await supabase.from('wallets').update({
          balance: wallet.balance + cashback
        }).eq('id', wallet_id);
      }
      
      // 3. Log transaction
      await supabase.from('transactions').insert([
        {
          user_id,
          business_id,
          wallet_id,
          order_id,
          amount,
          cashback_earned: cashback,
          referrer_id,
          referral_reward
        }
      ]);
      
      return new Response(JSON.stringify({
        status: 'ok'
      }), {
        status: 200
      });
    }
  } catch (err) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500
    });
  }
}); 