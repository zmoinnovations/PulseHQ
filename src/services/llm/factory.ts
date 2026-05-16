import { LLMProvider } from "./types";
import { GeminiProvider } from "./providers/gemini";
import { OpenAIProvider } from "./providers/openai";
import { ClaudeProvider } from "./providers/claude";

export function createProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || "gemini";

  switch (provider) {
    case "gemini":
      return new GeminiProvider(process.env.GEMINI_API_KEY!);
    case "openai":
      return new OpenAIProvider(process.env.OPENAI_API_KEY!);
    case "claude":
      return new ClaudeProvider(process.env.ANTHROPIC_API_KEY!);
    default:
      throw new Error(
        `Unknown LLM_PROVIDER: ${provider}. Use gemini, openai, or claude.`
      );
  }
}
