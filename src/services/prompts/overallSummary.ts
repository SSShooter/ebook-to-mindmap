// 全书总结相关的prompt模板

export const getOverallSummaryPrompt = (bookTitle: string, chapterInfo: string) => {
  const userPrompt = `书籍章节结构：
${chapterInfo}

以上是《${bookTitle}》这本书的重点内容，请生成一个全面的总结报告，帮助读者快速掌握全书精髓。`
  
  return userPrompt
}