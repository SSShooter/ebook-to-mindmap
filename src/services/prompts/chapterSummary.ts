// 章节总结相关的prompt模板

export const getFictionChapterSummaryPrompt = (title: string, content: string) => {
  const userPrompt = `请为以下章节内容生成一个详细总结：

章节标题：${title}

章节内容：
${content}

请用自然流畅的语言总结本章内容，包括主要情节发展、重要人物表现、关键观点或转折。`
  
  return userPrompt
}

export const getNonFictionChapterSummaryPrompt = (title: string, content: string) => {
  const userPrompt = `请为以下社科类书籍章节内容生成一个详细总结：

章节标题：${title}

章节内容：
${content}

请用自然流畅的语言总结本章内容，包括：

- 主要观点，以及支持这个观点的案例或研究发现
- 关键概念
- 保留几句有洞见的观点原文
- 给出指导实际生活的建议或应用（必须与此章节内容强关联）`
  
  return userPrompt
}