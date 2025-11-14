// 章节总结相关的prompt模板

export const getFictionChapterSummaryPrompt = (title: string, content: string) => {
  const userPrompt = `请为以下章节内容生成一个详细总结：

章节标题：${title}

章节内容：
${content}

请用自然流畅的语言总结本章内容，使用以下markdown格式：

## 章节总结：${title}

### 主要情节发展
[描述本章的主要情节发展]

### 人物及关系
[列出所有出现的人物及其关系]

### 关键转折
[描述本章的关键转折点]`
  
  return userPrompt
}

export const getNonFictionChapterSummaryPrompt = (title: string, content: string) => {
  const userPrompt = `请为以下社科类书籍章节内容生成一个详细总结：

章节标题：${title}

章节内容：
${content}

请用自然流畅的语言总结本章内容，使用以下markdown格式：

## 章节总结：${title}

### 主要观点
[总结本章的主要观点，以及支持这个观点的案例或研究发现]

### 关键概念
[列出并解释本章的关键概念]

### 洞见原文
[保留几句有洞见的观点原文，使用列表]

### 实际应用
[给出指导实际生活的建议或应用，必须与此章节内容强关联]`
  
  return userPrompt
}