// pages/api/webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { finix } from '../../lib/finixClient';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false, // Needed for Finix signature verification
  },
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // For Finix, we need to read the raw body and verify the signature
    const rawBody = await new Promise<Buffer>((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        resolve(Buffer.from(data));
      });
    });

    const signature = req.headers['finix-signature'] as string;
    const timestamp = req.headers['finix-timestamp'] as string;

    // Verify Finix webhook signature
    const isValid = finix.webhooks.verify(
      rawBody,
      signature,
      timestamp,
      process.env.FINIX_WEBHOOK_SECRET!
    );

    if (!isValid) {
      console.error('Finix webhook signature verification failed');
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString());

    // Handle Finix webhook events
    if (event.type === 'identity.updated') {
      const identity = event.data.object;

      if (identity.state === 'APPROVED' && identity.metadata?.merchantId) {
        const { error } = await supabase
          .from('businesses')
          .update({ finix_details_submitted: true })
          .eq('id', identity.metadata.merchantId);

        if (error) {
          console.error('Failed to update merchant onboarding status:', error.message);
          return res.status(500).send('Failed to update status');
        }

        console.log(`✅ Finix onboarding completed for merchant ${identity.metadata.merchantId}`);
      }
    }

    res.status(200).send('Webhook received');
  } catch (err: unknown) {
    console.error('Webhook processing error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).send(`Webhook Error: ${message}`);
  }
}
