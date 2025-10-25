// BAGIFY RECEIPT TRACKER - BACKEND SERVER
// Full Firebase integration for persistent storage

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// ============================================
// INITIALIZE EXPRESS
// ============================================

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============================================
// INITIALIZE FIREBASE
// ============================================

let db = null;
let firebaseInitialized = false;

try {
  // Parse Firebase service account from environment variable
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });

  db = admin.firestore();
  firebaseInitialized = true;
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.log('⚠️  Running in demo mode - data will not persist');
}

// ============================================
// API ENDPOINTS
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Bagify backend is running',
    firebase: firebaseInitialized ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// GET all receipts
app.get('/api/receipts', async (req, res) => {
  try {
    if (!firebaseInitialized) {
      return res.status(503).json({ error: 'Firebase not initialized' });
    }

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

    console.log(`📊 Fetched ${receipts.length} receipts from Firebase`);
    res.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST new receipt
app.post('/api/receipts', async (req, res) => {
  try {
    if (!firebaseInitialized) {
      return res.status(503).json({ error: 'Firebase not initialized' });
    }

    const { imageSrc, extractedText, orderDate, daysPassed, daysLeft, fileName } = req.body;

    // Validate required fields
    if (!imageSrc || !extractedText) {
      return res.status(400).json({ error: 'imageSrc and extractedText are required' });
    }

    const receiptData = {
      imageSrc,
      extractedText,
      orderDate: orderDate || 'N/A',
      daysPassed: daysPassed || 0,
      daysLeft: daysLeft || 18,
      status: 'Pending',
      note: '',
      fileName: fileName || `receipt-${Date.now()}`,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'system'
    };

    const docRef = await db.collection('receipts').add(receiptData);

    console.log(`✅ Receipt created in Firebase: ${docRef.id}`);

    res.status(201).json({
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
    if (!firebaseInitialized) {
      return res.status(503).json({ error: 'Firebase not initialized' });
    }

    const { id } = req.params;
    const { status, note, updatedBy } = req.body;

    const updateData = {
      status: status || 'Pending',
      note: note || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: updatedBy || 'user'
    };

    await db.collection('receipts').doc(id).update(updateData);

    // Fetch updated document
    const doc = await db.collection('receipts').doc(id).get();

    console.log(`✅ Receipt updated in Firebase: ${id}`);

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
    if (!firebaseInitialized) {
      return res.status(503).json({ error: 'Firebase not initialized' });
    }

    const { id } = req.params;
    await db.collection('receipts').doc(id).delete();

    console.log(`✅ Receipt deleted from Firebase: ${id}`);

    res.json({ success: true, message: 'Receipt deleted', id });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET alerts (orders at Day 5+)
app.get('/api/alerts', async (req, res) => {
  try {
    if (!firebaseInitialized) {
      return res.status(503).json({ error: 'Firebase not initialized' });
    }

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

    console.log(`🔔 Found ${alerts.length} alerts`);
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET statistics
app.get('/api/stats', async (req, res) => {
  try {
    if (!firebaseInitialized) {
      return res.status(503).json({ error: 'Firebase not initialized' });
    }

    const snapshot = await db.collection('receipts').get();
    const receipts = [];
    snapshot.forEach(doc => {
      receipts.push(doc.data());
    });

    const stats = {
      totalReceipts: receipts.length,
      pendingReceipts: receipts.filter(r => r.status === 'Pending').length,
      completedReceipts: receipts.filter(r => r.status === 'Done').length,
      alertReceipts: receipts.filter(r => r.status === 'Pending' && r.daysPassed >= 5).length
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TELEGRAM BOT FUNCTIONS (OPTIONAL - Phase 2)
// ============================================

async function sendTelegramMessage(message) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('⚠️  Telegram not configured - skipping message');
    return;
  }

  try {
    // Uncomment to enable Telegram alerts
    // const axios = require('axios');
    // await axios.post(
    //   `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    //   {
    //     chat_id: TELEGRAM_CHAT_ID,
    //     text: message,
    //     parse_mode: 'HTML'
    //   }
    // );
    console.log('📱 Telegram message prepared (not sent - feature in Phase 2)');
  } catch (error) {
    console.error('Error with Telegram:', error);
  }
}

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// General error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 Bagify Backend Server`);
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  if (firebaseInitialized) {
    console.log(`🔥 Firebase: Connected`);
    console.log(`💾 Data storage: Persistent (Firebase Firestore)`);
  } else {
    console.log(`🔥 Firebase: Not connected`);
    console.log(`💾 Data storage: In-memory (will reset on restart)`);
  }
  console.log(`\n🔗 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api/receipts - Get all receipts`);
  console.log(`   POST /api/receipts - Create receipt`);
  console.log(`   PUT  /api/receipts/:id - Update receipt`);
  console.log(`   DELETE /api/receipts/:id - Delete receipt`);
  console.log(`   GET  /api/alerts - Get pending alerts`);
  console.log(`   GET  /api/stats - Get statistics`);
  console.log(`${'='.repeat(50)}\n`);
});

module.exports = app;
