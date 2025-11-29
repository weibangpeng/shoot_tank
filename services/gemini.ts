import { GoogleGenAI } from "@google/genai";
import { LevelConfig } from "../types";

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getMissionBriefing = async (levelConfig: LevelConfig): Promise<string> => {
  if (!process.env.API_KEY) {
    return `Level ${levelConfig.level}: Eliminate all hostile targets.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a sci-fi tactical commander AI. 
      Write a very short, one-sentence mission briefing for the player who is about to start Level ${levelConfig.level} out of 10.
      
      Intel:
      - Enemy Density: ${levelConfig.enemyCount} units
      - Threat Velocity: ${levelConfig.enemySpeedBase.toFixed(1)}
      
      Tone: Urgent, Military, Cyberpunk.
      Max length: 25 words.`,
    });

    const text = response.text;
    return text ? text.trim() : `Level ${levelConfig.level}: Eliminate all hostile targets.`;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `Level ${levelConfig.level}: Communications jammed. Proceed with caution.`;
  }
};