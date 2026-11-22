/**
 * M R S Services — Gmail Collector for Google Apps Script
 * Reads official payment receipts from Payoneer, Skrill, and Binance directly in Gmail
 * and posts authenticated signed batches to MRS Core /api/ingest/email.
 * Also runs the recurring cron tick to move fulfillment and settlement along.
 */

function getScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  const rawUrl = props.getProperty('MRS_SITE') || props.getProperty('APP_URL') || 'https://mrs-services.ai.studio';
  return {
    siteUrl: rawUrl.replace(/\/+$/, ''),
    ingestSecret: props.getProperty('MRS_INGEST_SECRET') || '',
  };
}

function computeHmacSignature(secret, payload, timestamp) {
  const message = payload + timestamp;
  const signatureBytes = Utilities.computeHmacSha256Signature(message, secret);
  return signatureBytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

function pollPaymentEmails() {
  const { siteUrl, ingestSecret } = getScriptProperties();
  if (!ingestSecret) {
    Logger.log('Error: MRS_INGEST_SECRET is not configured in Script Properties.');
    return;
  }

  // Look for emails from official providers received in the last 2 hours
  const queries = [
    'from:payoneer.com "Payment" newer_than:2h',
    'from:skrill.com "Money received" newer_than:2h',
    'from:binance.com "Pay" newer_than:2h'
  ];

  const messagesToIngest = [];

  for (const q of queries) {
    const threads = GmailApp.search(q, 0, 10);
    for (const thread of threads) {
      const msgs = thread.getMessages();
      for (const msg of msgs) {
        if (!msg.isUnread()) continue;

        const rawContent = msg.getRawContent();
        let authResults = 'none';
        const authMatch = rawContent.match(/Authentication-Results:[^\r\n]+/i);
        if (authMatch) {
          authResults = authMatch[0];
        }

        messagesToIngest.push({
          id: msg.getId(),
          threadId: thread.getId(),
          from: msg.getFrom(),
          to: msg.getTo(),
          subject: msg.getSubject(),
          date: msg.getDate().toISOString(),
          body: msg.getPlainBody(),
          authResults: authResults,
        });

        msg.markRead();
      }
    }
  }

  if (messagesToIngest.length > 0) {
    const payload = JSON.stringify({ messages: messagesToIngest });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = computeHmacSignature(ingestSecret, payload, timestamp);

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: payload,
      headers: {
        'X-Timestamp': timestamp,
        'X-Signature': signature,
      },
      muteHttpExceptions: true,
    };

    const res = UrlFetchApp.fetch(siteUrl + '/api/ingest/email', options);
    Logger.log('Ingest response: ' + res.getResponseCode() + ' ' + res.getContentText());
  }

  // Ping cron tick
  try {
    const tickOptions = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + ingestSecret,
      },
      muteHttpExceptions: true,
    };
    UrlFetchApp.fetch(siteUrl + '/api/cron/tick', tickOptions);
  } catch (e) {
    Logger.log('Tick warning: ' + e);
  }
}

function setup() {
  ScriptApp.newTrigger('pollPaymentEmails')
    .timeBased()
    .everyMinutes(1)
    .create();
  Logger.log('Trigger installed: pollPaymentEmails runs every minute.');
}

function selfTest() {
  const { siteUrl, ingestSecret } = getScriptProperties();
  if (!ingestSecret) {
    Logger.log('Error: MRS_INGEST_SECRET is not configured in Script Properties.');
    return;
  }
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = JSON.stringify({ heartbeat: true });
  const signature = computeHmacSignature(ingestSecret, payload, timestamp);

  const res = UrlFetchApp.fetch(siteUrl + '/api/ingest/provider', {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    headers: {
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    },
    muteHttpExceptions: true,
  });

  Logger.log('Self-test response: ' + res.getResponseCode() + ' ' + res.getContentText());
  if (res.getResponseCode() === 200) {
    Logger.log('site answered 200');
  }
}
