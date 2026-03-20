'use strict';

const crypto = require('crypto');
const Iyzipay = require('iyzipay');
const { getIyzipay, isIyzicoConfigured } = require('./iyzicoClient');
const { getPublicApiBase } = require('./paymentProvider');

function formatIyzicoDate(d) {
  const dt = d ? new Date(d) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

/** username veya e-postadan alıcı adı (sandbox uyumlu) */
function buyerNameParts(user) {
  const u = String(user?.username || 'user').trim() || 'user';
  const parts = u.split(/[\s._-]+/).filter(Boolean);
  const name = (parts[0] || 'Musteri').slice(0, 40);
  const surname = (parts.slice(1).join(' ') || 'BiriVar').slice(0, 40);
  return { name, surname };
}

function clientIp(req) {
  const x = req?.headers?.['x-forwarded-for'];
  if (typeof x === 'string' && x.length) return x.split(',')[0].trim();
  if (req?.socket?.remoteAddress) return req.socket.remoteAddress;
  return '85.34.78.112';
}

function promisifyCreate(ikipay, request) {
  return new Promise((resolve, reject) => {
    ikipay.checkoutFormInitialize.create(request, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

/**
 * CheckoutForm “sipariş” başlatır: Iyzico ödeme sayfası URL’si döner.
 * @param {object} params
 * @param {import('express').Request} params.req
 * @param {object} params.user - Mongoose User doc (email, username, _id, …)
 * @param {object} params.planConfig - getPlanConfig sonucu (priceTRY, title, id, …)
 * @returns {Promise<{ paymentPageUrl: string, token: string, conversationId: string, raw: object }>}
 */
async function createHostedCheckoutForm({ req, user, planConfig }) {
  if (!isIyzicoConfigured()) {
    throw new Error('Iyzico yapılandırılmadı.');
  }

  const publicBase = getPublicApiBase();
  if (!publicBase) {
    throw new Error(
      'PUBLIC_API_URL (veya BACKEND_URL) tanımlı değil. Iyzico callback için internetten erişilebilir backend adresi gerekir (örn. https://api.sirketin.com veya ngrok).'
    );
  }

  const conversationId = crypto.randomUUID();
  const basketId = `BV-${planConfig.id}-${conversationId.slice(0, 8)}`;
  const priceStr = Number(planConfig.priceTRY);
  const { name, surname } = buyerNameParts(user);

  const callbackUrl = `${publicBase}/api/subscriptions/iyzico/callback`;

  const ikipay = getIyzipay();
  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId,
    price: priceStr,
    paidPrice: priceStr,
    currency: Iyzipay.CURRENCY.TRY,
    basketId,
    // Tek çekim abonelik ücreti; iyzico tarafında ürün satışı (CheckoutForm)
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl,
    enabledInstallments: [1, 2, 3],
    buyer: {
      id: String(user._id),
      name,
      surname,
      identityNumber: process.env.IYZICO_TEST_IDENTITY_NUMBER || '11111111111',
      email: String(user.email || 'musteri@birivar.local'),
      gsmNumber: process.env.IYZICO_TEST_GSM || '+905350000000',
      registrationAddress: process.env.IYZICO_TEST_ADDRESS || 'Dijital Hizmet, Turkey',
      city: process.env.IYZICO_TEST_CITY || 'Istanbul',
      country: process.env.IYZICO_TEST_COUNTRY || 'Turkey',
      zipCode: process.env.IYZICO_TEST_ZIP || '34000',
      ip: clientIp(req),
      registrationDate: formatIyzicoDate(user.createdAt),
      lastLoginDate: formatIyzicoDate(new Date()),
    },
    shippingAddress: {
      contactName: `${name} ${surname}`,
      city: process.env.IYZICO_TEST_CITY || 'Istanbul',
      country: process.env.IYZICO_TEST_COUNTRY || 'Turkey',
      address: process.env.IYZICO_TEST_ADDRESS || 'Dijital Hizmet, Turkey',
      zipCode: process.env.IYZICO_TEST_ZIP || '34000',
    },
    billingAddress: {
      contactName: `${name} ${surname}`,
      city: process.env.IYZICO_TEST_CITY || 'Istanbul',
      country: process.env.IYZICO_TEST_COUNTRY || 'Turkey',
      address: process.env.IYZICO_TEST_ADDRESS || 'Dijital Hizmet, Turkey',
      zipCode: process.env.IYZICO_TEST_ZIP || '34000',
    },
    basketItems: [
      {
        id: `plan-${planConfig.id}`,
        name: `BiriVar ${planConfig.title} abonelik`,
        category1: 'Yazilim',
        category2: 'Abonelik',
        itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
        price: priceStr,
      },
    ],
  };

  const result = await promisifyCreate(ikipay, request);
  if (result.status !== 'success') {
    const msg = result.errorMessage || result.errorCode || 'Iyzico initialize başarısız';
    const err = new Error(msg);
    err.iyzico = result;
    throw err;
  }

  const token = result.token;
  if (!token) {
    throw new Error('Iyzico yanıtında token yok.');
  }

  const paymentPageUrl =
    result.paymentPageUrl ||
    `${process.env.IYZICO_CHECKOUT_PAGE_BASE || 'https://sandbox-cpp.iyzipay.com'}?token=${encodeURIComponent(token)}&lang=tr`;

  return {
    paymentPageUrl,
    token,
    conversationId,
    raw: result,
  };
}

module.exports = {
  createHostedCheckoutForm,
  clientIp,
};
