'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isReservedRecipient, deliverableRecipients } = require('../../lib/reserved-mail');

test('reserved domains include .test and example.com', () => {
  assert.equal(isReservedRecipient('customer@sample-cars.test'), true);
  assert.equal(isReservedRecipient('bookings@sample-cars.test'), true);
  assert.equal(isReservedRecipient('a@example.com'), true);
  assert.equal(isReservedRecipient('hello@winjodigital.co.uk'), false);
});

test('production drops a reserved recipient and keeps a real one', () => {
  const previous = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = 'production';
  assert.deepEqual(deliverableRecipients(['customer@sample-cars.test', 'owner@shop.co.uk'], 'Booking'), ['owner@shop.co.uk']);
  process.env.VERCEL_ENV = 'preview';
  assert.deepEqual(deliverableRecipients(['customer@sample-cars.test'], 'Booking'), ['customer@sample-cars.test']);
  if (previous === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = previous;
});
