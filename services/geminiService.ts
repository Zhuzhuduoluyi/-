
import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API Key not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Fallback content to use when AI is unavailable or quota is exceeded
const FALLBACK_MESSAGES = [
  "It's ok! You did your best!",
  "Great hustle! Baking takes practice.",
  "You're a star baker in the making!",
  "Don't worry, even the best chefs drop toast.",
  "Eggie is proud of you no matter what!"
];

const FALLBACK_RECIPES = [
  "**Eggie's Simple Toast**\n1. Toast bread.\n2. Add butter.\n3. Enjoy!",
  "**Cinnamon Sugar Delight**\n1. Butter toast.\n2. Sprinkle cinnamon sugar.\n3. Eat warm.",
  "**Classic Jam Sandwich**\n1. Get two slices.\n2. Spread strawberry jam.\n3. Smash together!",
  "**Cheesy Melt**\n1. Put cheese on bread.\n2. Microwave for 30s.\n3. Gooey goodness."
];

const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const generateGameOverMessage = async (score: number): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return getRandom(FALLBACK_MESSAGES);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The user just finished a game called "Eggie's Bakery Catch". 
      The character is a cute egg named Eggie.
      The user scored ${score} points.
      
      Generate a very short, wholesome, and comforting message (max 2 sentences) from Eggie to the player. 
      If the score is low, emphasize that it's okay to fail. 
      If the score is high, congratulate them warmly but stay humble.
      Use emojis.`
    });
    return response.text || getRandom(FALLBACK_MESSAGES);
  } catch (error: any) {
    // Handle Quota Exceeded quietly
    if (error?.status === 429 || error?.code === 429 || (error?.message && error.message.includes('429'))) {
      console.warn("Gemini API quota exceeded. Using fallback message.");
      return getRandom(FALLBACK_MESSAGES);
    }
    console.error("Error generating message:", error);
    return getRandom(FALLBACK_MESSAGES);
  }
};

export const generateRewardRecipe = async (score: number): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return getRandom(FALLBACK_RECIPES);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The user scored ${score} points in a bread-catching game.
      Generate a simplified, fun title and 3-step instruction for a toast or sandwich recipe based on this score. 
      Keep it extremely brief. Format as markdown.`
    });
    return response.text || getRandom(FALLBACK_RECIPES);
  } catch (error: any) {
    // Handle Quota Exceeded quietly
    if (error?.status === 429 || error?.code === 429 || (error?.message && error.message.includes('429'))) {
      console.warn("Gemini API quota exceeded. Using fallback recipe.");
      return getRandom(FALLBACK_RECIPES);
    }
    console.error("Error generating recipe:", error);
    return getRandom(FALLBACK_RECIPES);
  }
};
