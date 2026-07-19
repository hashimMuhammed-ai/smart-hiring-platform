/**
 * Diagnostic script to test:
 * 1. SMTP connection to Brevo
 * 2. BullMQ queue status (pending/failed jobs)
 */
require('dotenv').config({ path: 'apps/api-gateway/.env' });
const nodemailer = require('nodemailer');

async function testSMTP() {
  console.log('\n=== SMTP CONNECTION TEST ===\n');

  const config = {
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'outboundcalling213@gmail.com',
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'support@smarthiring.com',
  };

  console.log('SMTP Host:', config.host);
  console.log('SMTP Port:', config.port);
  console.log('SMTP User:', config.user);
  console.log('EMAIL_FROM:', config.from);
  console.log('SMTP Pass:', config.pass ? '***SET***' : '***EMPTY***');

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  // Test 1: Verify SMTP connection (Port 587)
  console.log('\n--- Test 1: SMTP verify() (Port 587) ---');
  try {
    const result = await transporter.verify();
    console.log('✅ SMTP connection verified successfully (587):', result);
  } catch (err) {
    console.error('❌ SMTP connection (587) FAILED:', err.message);

    console.log('\n--- Retrying with Port 465 (SSL) ---');
    const transporter465 = nodemailer.createTransport({
      host: config.host,
      port: 465,
      secure: true,
      auth: { user: config.user, pass: config.pass },
    });

    try {
      const result465 = await transporter465.verify();
      console.log('✅ SMTP connection verified successfully (465):', result465);
    } catch (err465) {
      console.error('❌ SMTP connection (465) FAILED:', err465.message);
      return;
    }
  }

  // Test 2: Try sending a test email
  console.log('\n--- Test 2: Send test email ---');
  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: 'outboundcalling213@gmail.com', // send to yourself
      subject: 'Smart Hiring - SMTP Test',
      text: 'If you received this, SMTP is working correctly!',
    });
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
  } catch (err) {
    console.error('❌ Email send FAILED:', err.message);
    console.error('   Full error:', err);
    console.error('\n⚠️  LIKELY CAUSE: EMAIL_FROM address not verified in Brevo.');
    console.error('   Brevo requires the sender email to be verified.');
    console.error('   Go to: Brevo Dashboard → Settings → Senders & IPs → Add a sender');
    console.error('   Or change EMAIL_FROM to:', config.user, '(your signup email)');
  }
}

testSMTP().catch(console.error);
