'use strict';

const Iyzipay = require('iyzipay');
const { getIyzipay, isIyzicoConfigured } = require('./iyzicoClient');

function promisifyRetrieve(ikipay, request) {
  return new Promise((resolve, reject) => {
    ikipay.checkoutForm.retrieve(request, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

/**
 * Callback’te gelen token ile ödeme sonucunu Iyzico’dan çeker.
 * @param {string} token
 * @param {string} conversationId - Sipariş oluştururken gönderdiğimiz conversationId
 * @returns {Promise<object>}
 */
async function retrieveCheckoutFormPayment(token, conversationId) {
  if (!isIyzicoConfigured()) {
    throw new Error('Iyzico yapılandırılmadı.');
  }
  const ikipay = getIyzipay();
  return promisifyRetrieve(ikipay, {
    locale: Iyzipay.LOCALE.TR,
    conversationId,
    token,
  });
}

function isSuccessfulPayment(result) {
  if (!result || result.status !== 'success') return false;
  const ps = String(result.paymentStatus || '').toUpperCase();
  if (ps !== 'SUCCESS') return false;
  const fraud = result.fraudStatus;
  if (fraud !== undefined && fraud !== null && Number(fraud) < 0) return false;
  return true;
}

module.exports = {
  retrieveCheckoutFormPayment,
  isSuccessfulPayment,
};
