import { GoogleGenAI, Type } from '@google/genai';
import { Receipt, Status } from '../types';

// Get API key from Vite environment variables
const apiKey = import.meta.env.VITE_REACT_APP_API_KEY;
const backendUrl = import.meta.env.VITE_REACT_APP_API_URL || 'https://bagify-system.onrender.com';

if (!apiKey) {
  console.error('❌ API Key missing! Make sure VITE_REACT_APP_API_KEY is set in environment variables.');
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

async function extractTextFromImage(file: File): Promise<string> {
    try {
      const imagePart = await fileToGenerativePart(file);
      const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: {
              parts: [
                  imagePart,
                  { text: "Extract all visible text from this image. Provide the text exactly as it appears, maintaining line breaks." }
              ],
          },
      });
      return response.text.trim();
    } catch (error) {
      console.error('Error extracting text from image:', error);
      throw error;
    }
}

async function analyzeTextForDate(text: string): Promise<string> {
  if (!text) return 'N/A';
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Analyze the following receipt text and find the order date. The current year is 2025. If you see a date like 'DD/MM' or 'DD-MM', assume the year is 2025. Please return a JSON object with a single key "orderDate" in "YYYY-MM-DD" format. If no date is found, the value should be "N/A".\n\nText: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            orderDate: {
              type: Type.STRING,
              description: 'The order date in YYYY-MM-DD format or N/A if not found.',
            },
          },
        },
      },
    });

    const json = JSON.parse(response.text);
    return json.orderDate || 'N/A';
  } catch (error) {
    console.error("Error analyzing text for date:", error);
    return 'N/A';
  }
}

function calculateDateDifference(orderDate: string): { daysPassed: number, daysLeft: number } {
  if (orderDate === 'N/A') return { daysPassed: 0, daysLeft: 18 };

  const today = new Date('2025-10-24');
  const orderDateTime = new Date(orderDate).getTime();
  const todayTime = today.getTime();
  
  const diffTime = todayTime - orderDateTime;
  const daysPassed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const daysLeft = 18 - daysPassed;

  return { daysPassed, daysLeft };
}

// ============================================
// SEND TO BACKEND
// ============================================

async function saveReceiptToBackend(receiptData: any): Promise<any> {
  try {
    console.log('📤 Sending receipt to backend:', backendUrl);
    
    const response = await fetch(`${backendUrl}/api/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(receiptData),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    const savedReceipt = await response.json();
    console.log('✅ Receipt saved to backend:', savedReceipt);
    return savedReceipt;
  } catch (error) {
    console.error('❌ Error saving receipt to backend:', error);
    throw error;
  }
}

// ============================================
// MAIN PROCESS
// ============================================

export async function processReceiptFile(file: File): Promise<Receipt> {
    try {
      console.log('🔄 Processing receipt:', file.name);
      
      // Extract text from image
      const extractedText = await extractTextFromImage(file);
      console.log('✅ Text extracted');
      
      // Analyze for date
      const orderDate = await analyzeTextForDate(extractedText);
      console.log('✅ Date analyzed:', orderDate);
      
      // Calculate date difference
      const { daysPassed, daysLeft } = calculateDateDifference(orderDate);
      
      // Create object URL for image display
      const imageSrc = URL.createObjectURL(file);
      
      // Prepare receipt data
      const receiptData = {
        imageSrc,
        extractedText,
        orderDate,
        daysPassed,
        daysLeft,
        status: Status.Pending,
        note: '',
        fileName: file.name
      };

      // Send to backend
      console.log('📤 Sending to backend...');
      const backendReceipt = await saveReceiptToBackend(receiptData);
      
      // Return the response from backend (which includes ID and timestamp)
      return {
        id: backendReceipt.id || Date.now(),
        imageSrc,
        extractedText,
        orderDate,
        daysPassed,
        daysLeft,
        status: Status.Pending,
        note: '',
        fileName: file.name
      };
    } catch (error) {
      console.error('❌ Error processing receipt:', error);
      // Still return local receipt if backend fails (for demo)
      const imageSrc = URL.createObjectURL(file);
      return {
        id: Date.now(),
        imageSrc,
        extractedText: 'Error processing image',
        orderDate: 'N/A',
        daysPassed: 0,
        daysLeft: 18,
        status: Status.Pending,
        note: 'Error: Could not process receipt',
        fileName: file.name
      };
    }
}
