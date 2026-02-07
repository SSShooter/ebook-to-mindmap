// Prompt模板统一导出文件

export {
  getFictionChapterSummaryPrompt,
  getNonFictionChapterSummaryPrompt,
} from './chapterSummary'

export {
  getChapterConnectionsAnalysisPrompt,
  getFictionChapterConnectionsAnalysisPrompt,
} from './connectionAnalysis'

export {
  getOverallSummaryPrompt,
  getFictionOverallSummaryPrompt,
} from './overallSummary'

// 测试连接的prompt
export const getTestConnectionPrompt = () => '请回复"连接成功"'

export {
  getChapterMindMapPrompt,
  getMindMapArrowPrompt,
  getChapterMindMapStreamPrompt,
} from './mindmap'

export {
  getCharacterRelationshipPrompt,
  getFictionCharacterRelationshipPrompt,
} from './characterRelationship'
