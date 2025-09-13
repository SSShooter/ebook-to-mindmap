import { llmComplete, llmCompleteMindMap, type LlmConfig } from "../lib/llmClient";
import {
  getFictionChapterSummaryPrompt,
  getNonFictionChapterSummaryPrompt,
  getOverallSummaryPrompt,
  getChapterConnectionsAnalysisPrompt,
} from "./prompts";
import type { MindElixirData } from "mind-elixir";
import { getLanguageInstruction, type SupportedLanguage } from "./prompts/utils";

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  temperature?: number;
  apiKey?: string;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  summary?: string;
}

export class OllamaService {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  private getLlmConfig(): LlmConfig {
    return {
      baseURL: this.config.baseUrl,
      model: this.config.model,
      temperature: this.config.temperature || 0.7,
      apiKey: this.config.apiKey,
    };
  }

  // 统一的内容生成方法
  private async generateContent(prompt: string, outputLanguage?: SupportedLanguage): Promise<string> {
    const language = outputLanguage || 'en'
    const systemPrompt = getLanguageInstruction(language)
    const finalPrompt = `${prompt}\n\n**${systemPrompt}**`
    
    const config = this.getLlmConfig();
    
    return await llmComplete(config, [{ role: "user", content: finalPrompt }]);
  }

  // 统一的JSON解析方法
  private parseMindMapJson(mindMapJson: string): MindElixirData {
    if (!mindMapJson || mindMapJson.trim().length === 0) {
      throw new Error("AI返回了空的思维导图数据");
    }

    // 尝试解析JSON
    try {
      return JSON.parse(mindMapJson.trim());
    } catch {
      // 尝试从代码块中提取JSON
      const jsonMatch = mindMapJson.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch {
          throw new Error("AI返回的思维导图数据格式不正确");
        }
      }
      throw new Error("AI返回的思维导图数据格式不正确");
    }
  }

  async summarizeChapter(
    title: string,
    content: string,
    bookType: "fiction" | "non-fiction" = "non-fiction",
    outputLanguage: SupportedLanguage = "en",
    customPrompt?: string
  ): Promise<string> {
    try {
      let prompt =
        bookType === "fiction"
          ? getFictionChapterSummaryPrompt(title, content)
          : getNonFictionChapterSummaryPrompt(title, content);

      // 如果有自定义提示词，则拼接到原始prompt后面
      if (customPrompt && customPrompt.trim()) {
        prompt += `\n\n补充要求：${customPrompt.trim()}`;
      }

      const summary = await this.generateContent(prompt, outputLanguage);

      if (!summary || summary.trim().length === 0) {
        throw new Error("AI返回了空的总结");
      }

      return summary.trim();
    } catch (error) {
      throw new Error(
        `章节总结失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  }

  async generateChapterMindMap(
    content: string,
    _outputLanguage: SupportedLanguage = "en",
    customPrompt?: string
  ): Promise<MindElixirData> {
    try {
      // 使用 llmCompleteMindMap 自动强制JSON格式
      const mindMapJson = await llmCompleteMindMap(
        this.getLlmConfig(),
        content,
        customPrompt
      );

      return this.parseMindMapJson(mindMapJson);
    } catch (error) {
      throw new Error(
        `章节思维导图生成失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  async analyzeConnections(
    chapters: Chapter[],
    outputLanguage: SupportedLanguage = "en"
  ): Promise<string> {
    try {
      // 构建章节摘要信息
      const chapterSummaries = chapters
        .map((chapter) => `${chapter.title}:\n${chapter.summary || "无总结"}`)
        .join("\n\n");

      const prompt = getChapterConnectionsAnalysisPrompt(chapterSummaries);

      const connections = await this.generateContent(prompt, outputLanguage);

      if (!connections || connections.trim().length === 0) {
        throw new Error("AI返回了空的关联分析");
      }

      return connections.trim();
    } catch (error) {
      throw new Error(
        `章节关联分析失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  async generateOverallSummary(
    bookTitle: string,
    chapters: Chapter[],
    connections: string,
    outputLanguage: SupportedLanguage = "en"
  ): Promise<string> {
    try {
      // 构建简化的章节信息
      const chapterInfo = chapters
        .map(
          (chapter, index) =>
            `第${index + 1}章：${chapter.title}，内容：${
              chapter.summary || "无总结"
            }`
        )
        .join("\n");

      const prompt = getOverallSummaryPrompt(
        bookTitle,
        chapterInfo,
        connections
      );

      const overallSummary = await this.generateContent(prompt, outputLanguage);

      if (!overallSummary || overallSummary.trim().length === 0) {
        throw new Error("AI返回了空的全书总结");
      }

      return overallSummary.trim();
    } catch (error) {
      throw new Error(
        `全书总结生成失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  async generateCombinedMindMap(
    bookTitle: string,
    chapters: Chapter[],
    customPrompt?: string
  ): Promise<MindElixirData> {
    try {
      const chaptersContent = chapters
        .map((item) => item.content)
        .join("\n\n ------------- \n\n");
      
      const content = `整本书《${bookTitle}》的内容：\n${chaptersContent}`;

      // 使用 llmCompleteMindMap 自动强制JSON格式
      const mindMapJson = await llmCompleteMindMap(
        this.getLlmConfig(),
        content,
        customPrompt
      );

      return this.parseMindMapJson(mindMapJson);
    } catch (error) {
      throw new Error(
        `整书思维导图生成失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`
      );
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await llmComplete(this.getLlmConfig(), [
        { role: "user", content: 'Reply with "Connection successful"' },
      ]);
      return (
        result.includes("连接成功") ||
        result.includes("成功") ||
        result.includes("successful")
      );
    } catch {
      return false;
    }
  }
}
