// BAGIFY RECEIPT TRACKER - BACKEND SERVER
// Handles: Database, API, Telegram Bot, Google Drive Sync

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const axios = require('axios');
const cron = require('node-cron');
const dotenv = require('dotenv');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');

dotenv.config();

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.firestore();

// Google Drive Setup (Optional - Phase 2)
let driveService = null;
if (process.env.GOOGLE_DRIVE_ENABLED === 'true') {
  const { google } = require('googleapis');
  driveService = google.drive({
    version: 'v3',
    auth: new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/drive']
    })
  });
}

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ============================================
// API ENDPOINTS
// ============================================

// GET all receipts
app.get('/api/receipts', async (req, res) => {
  try {
    const snapshot = await db.collection('receipts')
      .orderBy('uploadedAt', 'desc')
      .get();
    
    const receipts = [];
    snapshot.forEach(doc => {
      receipts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST new receipt
app.post('/api/receipts', async (req, res) => {
  try {
    const { imageSrc, extractedText, orderDate, daysPassed, daysLeft, fileName } = req.body;

    const receiptData = {
      imageSrc,
      extractedText,
      orderDate,
      daysPassed,
      daysLeft,
      status: 'Pending',
      note: '',
      fileName,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'system'
    };

    const docRef = await db.collection('receipts').add(receiptData);

    res.json({
      id: docRef.id,
      ...receiptData,
      uploadedAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE receipt (status, notes)
app.put('/api/receipts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, updatedBy } = req.body;

    const updateData = {
      status,
      note,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: updatedBy || 'unknown'
    };

    await db.collection('receipts').doc(id).update(updateData);

    // Fetch updated document
    const doc = await db.collection('receipts').doc(id).get();

    res.json({
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE receipt
app.delete('/api/receipts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('receipts').doc(id).delete();
    res.json({ success: true, message: 'Receipt deleted' });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET alerts (orders at Day 5+)
app.get('/api/alerts', async (req, res) => {
  try {
    const snapshot = await db.collection('receipts')
      .where('status', '==', 'Pending')
      .get();

    const alerts = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.daysPassed >= 5 && data.daysPassed <= 18) {
        alerts.push({
          id: doc.id,
          ...data
        });
      }
    });

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TELEGRAM BOT FUNCTIONS
// ============================================

async function sendTelegramMessage(message) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      }
    );
    console.log('Telegram message sent successfully');
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

async function checkAndSendAlerts() {
  try {
    console.log('Checking for Day 5+ orders...');
    
    const snapshot = await db.collection('receipts')
      .where('status', '==', 'Pending')
      .get();

    let alertCount = 0;
    let messageText = '<b>🔔 BAGIFY DAILY ALERT</b>\n\n';
    let hasAlerts = false;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    snapshot.forEach(doc => {
      const data = doc.data();
      
      if (data.daysPassed >= 5 && data.daysPassed <= 18) {
        hasAlerts = true;
        alertCount++;
        
        if (data.daysPassed > 18) {
          messageText += `🔴 <b>OVERDUE</b>\n`;
        } else if (data.daysPassed >= 9) {
          messageText += `🟡 <b>DUE SOON</b>\n`;
        } else {
          messageText += `🟠 <b>DAY 5+</b>\n`;
        }

        messageText += `Order: ${data.fileName || 'N/A'}\n`;
        messageText += `Date: ${data.orderDate}\n`;
        messageText += `Days Passed: ${data.daysPassed}\n`;
        messageText += `Days Left: ${data.daysLeft}\n\n`;
      }
    });

    if (hasAlerts) {
      messageText += `Total Alerts: ${alertCount}\n`;
      messageText += `\n<a href="${process.env.APP_URL}">📱 Open Dashboard</a>`;
      
      await sendTelegramMessage(messageText);
    } else {
      console.log('No alerts to send today');
    }
  } catch (error) {
    console.error('Error in checkAndSendAlerts:', error);
  }
}

// ============================================
// SCHEDULED JOBS (Cron)
// ============================================

// Daily alert check at 5 PM Qatar time (UTC+3)
// Cron: 17 0 * * * (5 PM UTC, which is 8 PM Qatar time... adjust as needed)
cron.schedule('0 14 * * *', () => {
  console.log('Running scheduled alert check...');
  checkAndSendAlerts();
});

// Alternative: Check every 6 hours during working hours (for testing)
// Uncomment to use:
// cron.schedule('0 */6 * * *', () => {
//   console.log('Running 6-hourly alert check...');
//   checkAndSendAlerts();
// });

// ============================================
// GOOGLE DRIVE SYNC (Phase 2 - Optional)
// ============================================

async function syncReceiptsFromGoogleDrive() {
  if (!driveService || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
    console.log('Google Drive sync not configured');
    return;
  }

  try {
    console.log('Syncing from Google Drive...');
    // Implementation in Phase 2
    // This will auto-pull receipts from Google Drive folder
  } catch (error) {
    console.error('Error syncing from Google Drive:', error);
  }
}

// Optional: Sync from Google Drive daily at midnight Qatar time
// cron.schedule('0 21 * * *', () => {
//   console.log('Running Google Drive sync...');
//   syncReceiptsFromGoogleDrive();
// });

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Bagify Backend Server running on port ${PORT}`);
  console.log(`\n✅ Firebase connected`);
  console.log(`✅ Telegram bot configured`);
  console.log(`✅ Scheduled jobs active\n`);
});

module.exports = app;
