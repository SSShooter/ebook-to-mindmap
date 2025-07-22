// 章节关联分析相关的prompt模板

export const getChapterConnectionsAnalysisPrompt = (chapterSummaries: string) => `请分析以下各章节之间的关联性和逻辑关系：

${chapterSummaries}

请从以下角度进行分析：
1. 章节间的逻辑递进关系
2. 主题和概念的发展脉络
3. 人物或情节的连贯性
4. 重要观点的呼应和深化
5. 整体结构的安排意图

请提供一个详细的关联性分析，帮助读者理解各章节如何共同构建整本书的主题。`