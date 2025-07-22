// 全书总结相关的prompt模板

export const getOverallSummaryPrompt = (bookTitle: string, chapterInfo: string, connections: string) => `请为《${bookTitle}》这本书生成一个全面的总结报告：

书籍章节结构：
${chapterInfo}

章节关联分析：
${connections}

请生成一个包含以下内容的全书总结：

1. **核心主题**：书籍的主要思想和核心观点
2. **内容架构**：全书的逻辑结构和组织方式
3. **关键洞察**：最重要的观点、发现或启示
4. **实用价值**：对读者的意义和应用价值
5. **阅读建议**：如何更好地理解和应用书中内容

总结应该全面而深入，大约500-800字，帮助读者快速掌握全书精髓。`