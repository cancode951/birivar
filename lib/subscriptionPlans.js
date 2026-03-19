const PLANS = {
  free: {
    id: 'free',
    title: 'Free',
    priceTRY: 0,
    aiMessageLimit: 5,
    analysisLimit: 3,
    model: 'grok',
  },
  pro: {
    id: 'pro',
    title: 'Pro',
    priceTRY: 99.99,
    aiMessageLimit: 15,
    analysisLimit: 7,
    model: 'gpt-4o-mini',
  },
  premium: {
    id: 'premium',
    title: 'Premium',
    priceTRY: 199.99,
    aiMessageLimit: 30,
    analysisLimit: 10,
    model: 'gpt-4o',
  },
};

function getPlanConfig(plan) {
  return PLANS[plan] || PLANS.free;
}

function applyPlanLimits(user, plan) {
  const cfg = getPlanConfig(plan);
  user.plan = cfg.id;
  user.tier = cfg.id; // eski alanla uyumluluk
  user.aiMessageLimit = cfg.aiMessageLimit;
  user.analysisLimit = cfg.analysisLimit;
}

module.exports = {
  PLANS,
  getPlanConfig,
  applyPlanLimits,
};
