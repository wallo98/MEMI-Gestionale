'use strict';

/**
 * /api/payments  — Stripe PaymentIntent management
 *
 * POST /api/payments/create-intent
 *   Body: { amount_cents: number }
 *   Returns: { client_secret, payment_intent_id }
 *
 * Requires STRIPE_SECRET_KEY env var. If not set, returns 503.
 */

const router = require('express').Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

/* ── POST /api/payments/create-intent ── */
router.post('/create-intent', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Pagamenti non configurati sul server.' });
  }

  const { amount_cents } = req.body;
  if (!amount_cents || typeof amount_cents !== 'number' || amount_cents < 50) {
    return res.status(400).json({ error: 'Importo non valido (minimo €0.50).' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount_cents),
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      client_secret:     paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (err) {
    console.error('[Stripe] create-intent error:', err.message);
    res.status(502).json({ error: 'Errore Stripe: ' + (err.message || 'sconosciuto') });
  }
});

module.exports = router;
