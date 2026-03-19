const Stripe = require('stripe');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { PLANS, applyPlanLimits, getPlanConfig } = require('../lib/subscriptionPlans');

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

function getFrontendBase() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

async function getMySubscription(req, res) {
  try {
    const user = await User.findById(req.user._id).select(
      'plan aiMessageLimit analysisLimit subscriptionEndDate'
    );
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    return res.json({
      user,
      plans: Object.values(PLANS),
    });
  } catch (error) {
    console.error('Subscription me hatası:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

async function createCheckout(req, res) {
  try {
    const { plan } = req.body || {};
    const cfg = getPlanConfig(plan);
    if (!cfg || cfg.id === 'free') {
      return res.status(400).json({ message: 'Satin alma icin gecerli plan sec.' });
    }

    if (!stripe) {
      return res.status(503).json({
        message: 'Odeme servisi ayarli degil. STRIPE_SECRET_KEY tanimla.',
      });
    }

    const user = await User.findById(req.user._id).select('email username');
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'try',
            product_data: {
              name: `BiriVar ${cfg.title}`,
              description: `${cfg.aiMessageLimit} AI mesaj + ${cfg.analysisLimit} analiz hakki`,
            },
            unit_amount: Math.round(cfg.priceTRY * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${getFrontendBase()}/pricing?payment=success`,
      cancel_url: `${getFrontendBase()}/pricing?payment=cancel`,
      metadata: {
        userId: String(req.user._id),
        plan: cfg.id,
      },
      customer_email: user.email,
    });

    await Subscription.create({
      user: req.user._id,
      plan: cfg.id,
      stripeSessionId: session.id,
      status: 'pending',
      amount: cfg.priceTRY,
      currency: 'TRY',
      paymentProvider: 'stripe',
      metadata: { username: user.username || '' },
    });

    return res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Checkout hatası:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

async function markSubscriptionActive({ sessionId, userId, plan }) {
  const cfg = getPlanConfig(plan);
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const user = await User.findById(userId);
  if (!user) return;
  applyPlanLimits(user, cfg.id);
  user.subscriptionEndDate = endDate;
  await user.save();

  await Subscription.findOneAndUpdate(
    { stripeSessionId: sessionId },
    {
      $set: {
        status: 'active',
        amount: cfg.priceTRY,
        currency: 'TRY',
        plan: cfg.id,
      },
    },
    { new: true }
  );
}

async function stripeWebhook(req, res) {
  try {
    if (!stripe || !webhookSecret) {
      return res.status(503).send('Webhook ayari eksik');
    }
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session?.metadata?.userId;
      const plan = session?.metadata?.plan;
      if (userId && plan) {
        await markSubscriptionActive({
          sessionId: session.id,
          userId,
          plan,
        });
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook hatası:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
}

module.exports = {
  getMySubscription,
  createCheckout,
  stripeWebhook,
};
