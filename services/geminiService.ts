import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API Key not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateGameOverMessage = async (score: number): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "It's ok! You did your best!";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The user just finished a game called "Eggie's Bakery Catch". 
      The character is a cute egg named Eggie with a tag that says "It's ok".
      The user scored ${score} points.
      
      Generate a very short, wholesome, and comforting message (max 2 sentences) from Eggie to the player. 
      If the score is low, emphasize that it's okay to fail. 
      If the score is high, congratulate them warmly but stay humble.
      Use emojis.`
    });
    return response.text || "Great job! It's ok!";
  } catch (error) {
    console.error("Error generating message:", error);
    return "It's ok! Just try again!";
  }
};

export const generateRewardRecipe = async (score: number): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Keep playing to unlock recipes!";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The user scored ${score} points in a bread-catching game.
      Generate a simplified, fun title and 3-step instruction for a toast or sandwich recipe based on this score. 
      Keep it extremely brief. Format as markdown.`
    });
    return response.text || "Eggie's Special Toast: Butter, Sugar, Cinnamon!";
  } catch (error) {
    console.error("Error generating recipe:", error);
    return "";
  }
};
