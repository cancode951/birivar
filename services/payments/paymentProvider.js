'use strict';

const { isIyzicoConfigured } = require('./iyzicoClient');

/**
 * PAYMENT_PROVIDER=iyzico | stripe | auto
 * auto: Iyzico anahtarları varsa iyzico, yoksa (STRIPE_SECRET_KEY varsa) stripe
 */
function getPaymentProvider() {
  const explicit = String(process.env.PAYMENT_PROVIDER || '').toLowerCase().trim();
  if (explicit === 'iyzico') return 'iyzico';
  if (explicit === 'stripe') return 'stripe';

  if (isIyzicoConfigured()) return 'iyzico';
  if (process.env.STRIPE_SECRET_KEY) return 'stripe';
  return null;
}

function getPublicApiBase() {
  const raw = process.env.PUBLIC_API_URL || process.env.BACKEND_URL || process.env.API_URL || '';
  return String(raw).replace(/\/+$/, '');
}

function getFrontendBase() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

module.exports = {
  getPaymentProvider,
  getPublicApiBase,
  getFrontendBase,
};
