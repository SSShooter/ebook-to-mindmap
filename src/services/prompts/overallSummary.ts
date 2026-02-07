// 全书总结相关的prompt模板

export const getOverallSummaryPrompt = (
  bookTitle: string,
  chapterInfo: string
) => {
  const userPrompt = `书籍章节结构：
${chapterInfo}

以上是《${bookTitle}》这本书的重点内容，请生成一个全面的总结报告，帮助读者快速掌握全书精髓。`

  return userPrompt
}

// 专门针对小说的全书总结prompt
export const getFictionOverallSummaryPrompt = (
  bookTitle: string,
  chapterInfo: string
) => {
  const userPrompt = `小说章节结构：
${chapterInfo}

以上是小说《${bookTitle}》的章节内容，请生成一个全面的故事总结报告，帮助读者快速了解整个故事。

请从以下几个方面进行总结：

## 1. 故事概述
- 简要介绍整个故事的主要情节
- 故事发生的时代背景和地点
- 故事的主要冲突和结局

## 2. 主要人物
- 介绍故事中的核心人物及其性格特点
- 描述人物之间的关系和互动
- 主要人物在故事中的成长和变化

## 3. 主题与意义
- 这本小说探讨了哪些核心主题
- 故事中蕴含的深层含义或象征
- 作者想要传达的思想或情感

## 4. 阅读价值
- 这本小说的文学价值和艺术特色
- 推荐给喜欢什么类型故事的读者
- 阅读这本小说可能带来的思考和感悟

请用生动的语言来总结，让读者能够感受到小说的魅力和深度。`

  return userPrompt
}
