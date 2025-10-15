import { openai } from "@ai-sdk/openai";

// Export the configured OpenAI instance
export { openai };

// You can also export specific models if needed
export const gpt4 = openai("gpt-4");
export const gpt4Turbo = openai("gpt-4-turbo");
export const gpt35Turbo = openai("gpt-3.5-turbo");
export const gpt4o = openai("gpt-4o");
export const gpt4oMini = openai("gpt-4o-mini");
