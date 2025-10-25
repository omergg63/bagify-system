// BAGIFY RECEIPT TRACKER - SIMPLIFIED BACKEND SERVER
// Simple API endpoints, in-memory storage, no Firebase required
// Data resets on server restart (can add database later)

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============================================
// IN-MEMORY STORAGE
// ============================================

let receipts = [];
let receiptId = 1;

// ============================================
// API ENDPOINTS
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Bagify backend is running',
    timestamp: new Date()
  });
});

// GET all receipts
app.get('/api/receipts', (req, res) => {
  try {
    const sortedReceipts = receipts.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    res.json(sortedReceipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST new receipt
app.post('/api/receipts', (req, res) => {
  try {
    const { imageSrc, extractedText, orderDate, daysPassed, daysLeft, fileName } = req.body;

    // Validate required fields
    if (!imageSrc || !extractedText) {
      return res.status(400).json({ error: 'imageSrc and extractedText are required' });
    }

    const newReceipt = {
      id: receiptId++,
      imageSrc,
      extractedText,
      orderDate: orderDate || 'N/A',
      daysPassed: daysPassed || 0,
      daysLeft: daysLeft || 18,
      status: 'Pending',
      note: '',
      fileName: fileName || `receipt-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };

    receipts.push(newReceipt);

    console.log(`✅ Receipt created: ${newReceipt.fileName} (ID: ${newReceipt.id})`);

    res.status(201).json(newReceipt);
  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE receipt (status, notes)
app.put('/api/receipts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, updatedBy } = req.body;

    const receipt = receipts.find(r => r.id === parseInt(id));
    
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    if (status) receipt.status = status;
    if (note !== undefined) receipt.note = note;
    receipt.updatedAt = new Date().toISOString();
    receipt.updatedBy = updatedBy || 'user';

    console.log(`✅ Receipt updated: ID ${id}`);

    res.json(receipt);
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE receipt
app.delete('/api/receipts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const initialLength = receipts.length;
    receipts = receipts.filter(r => r.id !== parseInt(id));
    
    if (receipts.length === initialLength) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    console.log(`✅ Receipt deleted: ID ${id}`);

    res.json({ success: true, message: 'Receipt deleted', id: parseInt(id) });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET alerts (orders at Day 5+)
app.get('/api/alerts', (req, res) => {
  try {
    const alerts = receipts.filter(r => {
      return r.status === 'Pending' && r.daysPassed >= 5 && r.daysPassed <= 18;
    });

    console.log(`📊 Alerts check: ${alerts.length} alerts found`);

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET statistics
app.get('/api/stats', (req, res) => {
  try {
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
// TELEGRAM BOT FUNCTIONS (OPTIONAL - FOR FUTURE USE)
// ============================================

async function sendTelegramMessage(message) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('⚠️  Telegram not configured - skipping message');
    return;
  }

  try {
    // Uncomment to actually send Telegram messages
    // const axios = require('axios');
    // await axios.post(
    //   `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    //   {
    //     chat_id: TELEGRAM_CHAT_ID,
    //     text: message,
    //     parse_mode: 'HTML'
    //   }
    // );
    console.log('📱 Telegram message (would be sent if configured):', message.substring(0, 50) + '...');
  } catch (error) {
    console.error('Error sending Telegram message:', error);
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
  res.status(500).json({ error: 'Internal server error' });
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
  console.log(`📊 API endpoints ready`);
  console.log(`💾 Using in-memory storage (resets on restart)`);
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
