export const getChapterMindMapPrompt = () => {
  const userPrompt = `\`\`\`ts
export interface NodeObj {
  topic: string
  id: string
  tags?: string[]
  children?: NodeObj[]
}
// 总结父id的第start到end个节点的内容
export interface Summary {
  id: string
  label: string
  /**
   * parent node id of the summary
   */
  parent: string
  /**
   * start index of the summary
   */
  start: number
  /**
   * end index of the summary
   */
  end: number
}
\`\`\`

使用符合  {
  nodeData: NodeObj
  summaries?: Summary[]
} 格式的 JSON 回复用户，这是一个表达**思维导图数据**的递归结构。

**注意！！nodeData、summaries 在同一层级！！**

**严格遵守**：
- 节点 ID 使用递增数字即可
- 注意不要一昧使用兄弟节点关系，适当应用父子级别的分层
- 如果内容为社科类书籍，向节点插入 tags 可选：核心、案例、实践、金句
- Summary 是总结多个同父节点的子节点的工具，会使用花括号把总结文本显示在指定子节点侧边，因为节点存在两侧分布的情况，禁止总结根节点
- 适当添加 Summary，不要添加多余的 Summary
- 最后添加一个金句节点记录几句本章金句
- 适当添加表达该节点内涵的 emoji
- 输出应直接以 { 开始，以 } 结束
`

  return userPrompt
}

export const getMindMapArrowPrompt = () => {
  const userPrompt = `你需要为已有的思维导图添加箭头连接，以显示不同节点之间的关联关系。
\`\`\`ts
export interface NodeObj {
  topic: string
  id: string
  tags?: string[]
  children?: NodeObj[]
}

export interface Arrow {
  id: string
  /**
   * label of arrow
   */
  label: string
  /**
   * id of start node
   */
  from: string
  /**
   * id of end node
   */
  to: string
  /**
   * offset of control point from start point
   */
  delta1: {
    x: number
    y: number
  }
  /**
   * offset of control point from end point
   */
  delta2: {
    x: number
    y: number
  }
  /**
   * whether the arrow is bidirectional
   */
  bidirectional?: boolean
}
\`\`\`

使用符合  {
  arrows?: Arrow[]
} 格式的 JSON 回复用户。


**严格遵守**：
- Arrow 可以添加连接任意节点的箭头，label 间接说明两个节点的联系，delta 的默认值为 50,50。**直接的父子关系不需要链接**
- **直接的父子关系不需要使用 Arrow 链接**
- 只能添加 6 条以下 Arrow，请对最关键的节点关系进行链接
- 确保JSON格式正确，不要返回任何JSON以外的内容
- 输出应直接以 { 开始，以 } 结束
`

  return userPrompt
}
