'use strict';

/**
 * Email notifications  —  nodemailer
 *
 * Requires env vars:
 *   SMTP_HOST   (default: smtp.gmail.com)
 *   SMTP_PORT   (default: 587)
 *   SMTP_SECURE (default: false  — set to "true" for port 465)
 *   SMTP_USER   (your sending email address)
 *   SMTP_PASS   (app password / SMTP password)
 *   SMTP_FROM   (optional display sender — defaults to SMTP_USER)
 *
 * If SMTP_USER is not set, all send functions are no-ops (safe to call).
 */

const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  if (!process.env.SMTP_USER) return null;
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return _transporter;
}

/**
 * Send order confirmation to customer.
 * @param {object} order
 * @param {string} order.order_number
 * @param {string} order.nome
 * @param {string} order.cognome
 * @param {string} order.email
 * @param {Array}  order.items  — [{product_name, taglia, qty, price}]
 * @param {number} order.total
 */
async function sendOrderConfirmation(order) {
  const t = getTransporter();
  if (!t) return; // SMTP not configured — skip silently

  const { order_number, nome, email, items = [], total } = order;
  const from = `"Memi Abbigliamento" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;

  const itemRows = items.map(i =>
    `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #f0e8e0;">${i.product_name || ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0e8e0;color:#888;">${i.taglia || 'unica'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0e8e0;text-align:center;">×${i.qty || 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0e8e0;text-align:right;">€${parseFloat(i.price || 0).toFixed(2)}</td>
    </tr>`
  ).join('');

  const textItems = items.map(i =>
    `  - ${i.product_name} (${i.taglia || 'unica'}) × ${i.qty}  →  €${parseFloat(i.price || 0).toFixed(2)}`
  ).join('\n');

  const html = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><title>Conferma ordine ${order_number}</title></head>
<body style="margin:0;padding:0;background:#faf7f4;font-family:'Helvetica Neue',Arial,sans-serif;color:#3B2B2B;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.06);">
    <div style="background:#3B2B2B;padding:32px 40px;text-align:center;">
      <h1 style="color:#fff;font-size:28px;font-weight:300;letter-spacing:.12em;margin:0;">Memi<span style="color:#c9897a;">.</span></h1>
    </div>
    <div style="padding:36px 40px;">
      <p style="font-size:18px;font-weight:500;margin:0 0 8px;">Ciao ${nome},</p>
      <p style="color:#7a6060;margin:0 0 24px;">Grazie per il tuo ordine! Lo stiamo preparando con cura.</p>
      <div style="background:#faf7f4;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#a89090;margin:0 0 4px;">Numero ordine</p>
        <p style="font-size:22px;font-family:Georgia,serif;font-weight:400;margin:0;color:#3B2B2B;">${order_number}</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#faf7f4;">
            <th style="padding:8px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:.08em;color:#a89090;font-weight:500;">Articolo</th>
            <th style="padding:8px;font-size:11px;text-align:left;text-transform:uppercase;letter-spacing:.08em;color:#a89090;font-weight:500;">Taglia</th>
            <th style="padding:8px;font-size:11px;text-align:center;text-transform:uppercase;letter-spacing:.08em;color:#a89090;font-weight:500;">Qtà</th>
            <th style="padding:8px;font-size:11px;text-align:right;text-transform:uppercase;letter-spacing:.08em;color:#a89090;font-weight:500;">Prezzo</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:12px 8px;text-align:right;font-weight:600;font-size:15px;">Totale</td>
            <td style="padding:12px 8px;text-align:right;font-size:18px;font-family:Georgia,serif;">€${parseFloat(total || 0).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="color:#7a6060;font-size:14px;line-height:1.6;">Riceverai un'email separata con il numero di tracciamento non appena il pacco viene preso in carico dal corriere.</p>
    </div>
    <div style="background:#faf7f4;padding:20px 40px;text-align:center;font-size:12px;color:#a89090;">
      © 2026 Memi Abbigliamento · Milano, Italia
    </div>
  </div>
</body>
</html>`;

  const text = `Ciao ${nome},\n\nGrazie per il tuo ordine ${order_number}!\n\nArticoli:\n${textItems}\n\nTotale: €${parseFloat(total || 0).toFixed(2)}\n\nLo spediremo al più presto.\n\nCordiali saluti,\nMemi Abbigliamento`;

  try {
    await t.sendMail({ from, to: email, subject: `Conferma ordine ${order_number} — Memi`, text, html });
    console.log(`[email] Sent order confirmation ${order_number} → ${email}`);
  } catch (err) {
    // Never fail the order because of email — just log
    console.error('[email] Failed to send confirmation:', err.message);
  }
}

module.exports = { sendOrderConfirmation };
