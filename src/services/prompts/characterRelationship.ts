// 人物关系图生成相关的prompt模板

export const getCharacterRelationshipPrompt = (chapterSummaries: string) => {
  const userPrompt = `请根据以下章节内容，生成一个mermaid格式的人物关系图：

${chapterSummaries}

请按照以下要求生成关系图：

1. **识别主要人物**：从章节内容中提取3-10个核心人物
2. **人物关系**：用箭头和标签标注人物之间的关系（如：朋友、敌人、师徒、亲属等）
3. **使用mermaid语法**：使用graph TD或graph LR格式
4. **节点命名**：使用简洁的标识符，在节点中显示人物姓名
5. **关系描述**：箭头上标注简短的关系描述

请直接输出mermaid代码，不要包含其他解释文字。确保代码可以直接被mermaid渲染。`

  return userPrompt
}

// 专门针对小说的人物关系图prompt
export const getFictionCharacterRelationshipPrompt = (chapterSummaries: string) => {
  const userPrompt = `请根据以下小说章节内容，生成一个mermaid格式的人物关系图：

${chapterSummaries}

请按照以下要求生成关系图：

1. **主要角色**：识别小说中的人物
2. **关系类型**：人物间连线必须标注关系
3. **关系演变**：如果关系有重大变化，可以用不同样式的箭头表示
4. **使用mermaid语法**：使用graph TD或graph LR格式
5. **人物特征**：可以在节点中简要标注人物的身份或特征

注意：
- 使用实线箭头 (-->) 表示主要关系
- 使用虚线箭头 (-.-> ) 表示复杂或变化的关系
- 确保人物姓名准确，关系描述简洁

请直接输出mermaid代码，不要包含其他解释文字。确保代码可以直接被mermaid渲染。`

  return userPrompt
}
