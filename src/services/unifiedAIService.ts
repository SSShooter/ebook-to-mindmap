import { AIService } from "./geminiService";
import { OllamaService } from "./ollamaService";
import { useConfigStore } from "../stores/configStore";

export function createAIService() {
  const config = useConfigStore.getState().aiConfig;

  if (config.provider === "ollama") {
    return new OllamaService({
      baseUrl: config.apiUrl || "http://localhost:11434",
      model: config.model || "llama2",
      temperature: config.temperature,
    });
  }

  return new AIService(() => ({
    provider: config.provider as "gemini" | "openai",
    apiKey: config.apiKey,
    apiUrl: config.apiUrl,
    model: config.model,
    temperature: config.temperature,
  }));
}
