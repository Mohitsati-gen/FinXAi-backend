import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const scanReceiptWithAI = async (imageBuffer, mimeType) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a receipt scanner. Analyze this receipt image and extract the following information in JSON format only. No explanation, just JSON.

  Return exactly this structure:
  {
    "amount": <number>,
    "category": <one of: Housing, Food, Transport, Entertainment, Shopping, Utilities, Travel, Healthcare, Rental, Other, Salary, Freelance, Investments, Business, Gift>,
    "date": <YYYY-MM-DD format>,
    "description": <short description of what was purchased>,
    "type": <"EXPENSE" or "INCOME">
  }

  If you cannot determine a field, use null for that field.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType,                                    // e.g. "image/jpeg"
        data: imageBuffer.toString("base64"),        // base64 image
      },
    },
  ]);

  const text = result.response.text().trim();

  // strip markdown code fences if Gemini wraps it
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
};