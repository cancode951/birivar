'use strict';

const Iyzipay = require('iyzipay');

let singleton = null;

/**
 * Ortam değişkenleri (.env) — sandbox / canlı arasında sadece bunları değiştirmen yeterli:
 * - IYZICO_API_KEY
 * - IYZICO_SECRET_KEY
 * - IYZICO_URI  (sandbox: https://sandbox-api.iyzipay.com  |  canlı: https://api.iyzipay.com)
 */
function isIyzicoConfigured() {
  const k = process.env.IYZICO_API_KEY || '';
  const s = process.env.IYZICO_SECRET_KEY || '';
  const u = process.env.IYZICO_URI || '';
  return Boolean(k && s && u);
}

function getIyzipay() {
  if (!isIyzicoConfigured()) {
    throw new Error('Iyzico ortam değişkenleri eksik (IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_URI).');
  }
  if (!singleton) {
    singleton = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: process.env.IYZICO_URI,
    });
  }
  return singleton;
}

module.exports = {
  getIyzipay,
  isIyzicoConfigured,
};
