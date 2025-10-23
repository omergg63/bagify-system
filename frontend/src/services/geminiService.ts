import { GoogleGenAI, Type } from '@google/genai';
import { Receipt, Status } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    const imagePart = await fileToGenerativePart(file);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                imagePart,
                { text: "Extract all visible text from this image. Provide the text exactly as it appears, maintaining line breaks." }
            ],
        },
    });
    return response.text.trim();
}

async function analyzeTextForDate(text: string): Promise<string> {
  if (!text) return 'N/A';
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
    return 'N/A'; // Fallback on error
  }
}

function calculateDateDifference(orderDate: string): { daysPassed: number, daysLeft: number } {
  if (orderDate === 'N/A') return { daysPassed: 0, daysLeft: 18 };

  const today = new Date('2025-10-24'); // Using a fixed 'today' for consistent demo
  const orderDateTime = new Date(orderDate).getTime();
  const todayTime = today.getTime();
  
  const diffTime = todayTime - orderDateTime;
  const daysPassed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const daysLeft = 18 - daysPassed;

  return { daysPassed, daysLeft };
}

export async function processReceiptFile(file: File): Promise<Receipt> {
    const extractedText = await extractTextFromImage(file);
    const orderDate = await analyzeTextForDate(extractedText);
    const { daysPassed, daysLeft } = calculateDateDifference(orderDate);
    const imageSrc = URL.createObjectURL(file);
    
    return {
        id: Date.now(),
        imageSrc,
        extractedText,
        orderDate,
        daysPassed,
        daysLeft,
        status: Status.Pending,
        note: '',
        fileName: file.name
    };
}
