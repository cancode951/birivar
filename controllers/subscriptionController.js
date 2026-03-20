const Stripe = require('stripe');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { PLANS, applyPlanLimits, getPlanConfig } = require('../lib/subscriptionPlans');
const { createHostedCheckoutForm } = require('../services/payments/iyzicoOrderService');
const {
  retrieveCheckoutFormPayment,
  isSuccessfulPayment,
} = require('../services/payments/iyzicoPaymentService');
const {
  getPaymentProvider,
  getPublicApiBase,
  getFrontendBase,
} = require('../services/payments/paymentProvider');
const { isIyzicoConfigured } = require('../services/payments/iyzicoClient');

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

async function finalizePaidPlan({ userId, plan, subscriptionFilter, subscriptionMetadata }) {
  const cfg = getPlanConfig(plan);
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const user = await User.findById(userId);
  if (!user) return;

  applyPlanLimits(user, cfg.id);
  user.subscriptionEndDate = endDate;
  await user.save();

  const setPayload = {
    status: 'active',
    amount: cfg.priceTRY,
    currency: 'TRY',
    plan: cfg.id,
  };
  if (subscriptionMetadata && typeof subscriptionMetadata === 'object') {
    setPayload.metadata = subscriptionMetadata;
  }

  await Subscription.findOneAndUpdate(subscriptionFilter, { $set: setPayload }, { new: true });
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
      paymentProvider: getPaymentProvider(),
      publicApiConfigured: Boolean(getPublicApiBase()),
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

    const provider = getPaymentProvider();
    if (!provider) {
      return res.status(503).json({
        message:
          'Odeme saglayicisi ayarli degil. .env icinde Iyzico anahtarlari veya STRIPE_SECRET_KEY tanimla; PAYMENT_PROVIDER=iyzico veya stripe.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    if (provider === 'iyzico') {
      if (!isIyzicoConfigured()) {
        return res.status(503).json({
          message: 'Iyzico ayarli degil. IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_URI kontrol et.',
        });
      }
      try {
        const init = await createHostedCheckoutForm({
          req,
          user,
          planConfig: cfg,
        });

        await Subscription.create({
          user: req.user._id,
          plan: cfg.id,
          iyzicoConversationId: init.conversationId,
          iyzicoPaymentToken: init.token,
          status: 'pending',
          amount: cfg.priceTRY,
          currency: 'TRY',
          paymentProvider: 'iyzico',
          metadata: { username: user.username || '' },
        });

        return res.json({ checkoutUrl: init.paymentPageUrl, provider: 'iyzico' });
      } catch (err) {
        console.error('Iyzico checkout hatası:', err?.message || err, err?.iyzico || '');
        return res.status(500).json({
          message: err?.message || 'Odeme oturumu acilamadi.',
        });
      }
    }

    // Stripe
    if (!stripe) {
      return res.status(503).json({
        message: 'Stripe ayarli degil. STRIPE_SECRET_KEY tanimla veya PAYMENT_PROVIDER=iyzico kullan.',
      });
    }

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

    return res.json({ checkoutUrl: session.url, provider: 'stripe' });
  } catch (error) {
    console.error('Checkout hatası:', error.message);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
}

async function markSubscriptionActiveStripe({ sessionId, userId, plan }) {
  return finalizePaidPlan({
    userId,
    plan,
    subscriptionFilter: { stripeSessionId: sessionId },
  });
}

/**
 * Iyzico CheckoutForm callback (form POST, token ile).
 */
async function iyzicoCallback(req, res) {
  const front = getFrontendBase();
  const redirectFail = (reason) => res.redirect(`${front}/pricing?payment=fail${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`);
  const redirectOk = () => res.redirect(`${front}/pricing?payment=success`);

  try {
    const token = req.body?.token || req.query?.token;
    if (!token) {
      return redirectFail('token');
    }

    const pending = await Subscription.findOne({
      iyzicoPaymentToken: String(token),
      status: 'pending',
    });

    if (!pending || !pending.iyzicoConversationId) {
      return redirectFail('order');
    }

    const result = await retrieveCheckoutFormPayment(token, pending.iyzicoConversationId);

    if (!isSuccessfulPayment(result)) {
      const prevMeta =
        pending.metadata && typeof pending.metadata === 'object' ? { ...pending.metadata } : {};
      await Subscription.findByIdAndUpdate(pending._id, {
        $set: {
          status: 'failed',
          metadata: {
            ...prevMeta,
            lastIyzico: {
              paymentStatus: result?.paymentStatus,
              status: result?.status,
              at: new Date().toISOString(),
            },
          },
        },
      }).catch(() => {});
      return redirectFail('declined');
    }

    const meta = pending.metadata && typeof pending.metadata === 'object' ? { ...pending.metadata } : {};
    meta.iyzicoPaymentId = result.paymentId || null;

    await finalizePaidPlan({
      userId: pending.user,
      plan: pending.plan,
      subscriptionFilter: { _id: pending._id },
      subscriptionMetadata: meta,
    });

    return redirectOk();
  } catch (e) {
    console.error('Iyzico callback hatası:', e?.message || e);
    return redirectFail('server');
  }
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
        await markSubscriptionActiveStripe({
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
  iyzicoCallback,
  stripeWebhook,
};
