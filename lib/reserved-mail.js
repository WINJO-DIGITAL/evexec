'use strict';
// Addresses production must not try to deliver. .test and the example domains are reserved
// and sit in Resend as delivery_delayed. Preview and local runs are unchanged.

const RESERVED = /^(.*\.)?example\.(com|org|net)$|\.example$|\.test$|\.invalid$|\.localhost$/i;

function isProductionMail() {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === 'production';
  return process.env.NODE_ENV === 'production';
}

function isReservedRecipient(address) {
  const raw = String(address || '').trim().toLowerCase();
  const at = raw.lastIndexOf('@');
  const host = at === -1 ? '' : raw.slice(at + 1);
  return Boolean(host) && !host.includes(' ') && RESERVED.test(host);
}

/** Drops reserved recipients in production and logs one line. Returns the addresses still to send. */
function deliverableRecipients(addresses, label = 'Email') {
  const list = (Array.isArray(addresses) ? addresses : [addresses]).map((a) => String(a || '').trim()).filter(Boolean);
  if (!isProductionMail()) return list;
  return list.filter((address) => {
    if (!isReservedRecipient(address)) return true;
    console.info(`${label} skipped: a reserved address was not emailed from production`);
    return false;
  });
}

module.exports = { isProductionMail, isReservedRecipient, deliverableRecipients };
