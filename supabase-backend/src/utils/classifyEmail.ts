import llm from "./llm.js";

export interface EmailCategory {
  category: string;
  confidence: number;
  reasoning: string;
}

async function classifyEmail(
  subject: string,
  from: string,
  categories: { name: string; description?: string }[],
  snippet?: string
): Promise<EmailCategory> {
  // Build the prompt including descriptions
  const categoryList = categories.map(c => `- ${c.name}${c.description ? `: ${c.description}` : ''}`).join("\n");

  const prompt = `Please classify this email into one of these categories:
${categoryList}

Email Subject: ${subject}
From: ${from}
${snippet ? `Content Snippet: ${snippet}` : ""}

Please respond with only a JSON object in this exact format:
{
  "category": "category_name",
  "confidence": 0.95,
  "reasoning": "brief explanation of why this category was chosen"
};`;

  try {
    const response = await llm.invoke(prompt);
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as EmailCategory;
    } else {
      return { category: "Other", confidence: 0.5, reasoning: "Could not parse LLM response" };
    }
  } catch (error) {
    console.error("Error classifying email:", error);
    return { category: "Other", confidence: 0.5, reasoning: "Error occurred during classification" };
  }
}

export default classifyEmail;
