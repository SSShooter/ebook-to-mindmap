# EPUB 结构说明

## TOC（目录）vs Spine（书脊）的关系

### Spine（书脊）
- **定义**：定义了 EPUB 中所有内容文件的**线性阅读顺序**
- **作用**：告诉阅读器按什么顺序显示内容
- **特点**：
  - 包含所有内容文件（HTML/XHTML）
  - 严格按照阅读顺序排列
  - 每个文件都有一个 spineIndex（0, 1, 2, ...）
  - 是 EPUB 的"骨架"
  - 用于程序化精确定位

### TOC（目录）
- **定义**：提供给读者的**导航结构**
- **作用**：让读者快速跳转到感兴趣的章节
- **特点**：
  - 可能不包含所有 spine 中的文件
  - 可能有层级结构（章、节、小节）
  - 主要用于用户导航
  - 是面向用户的"索引"
  - 提供有意义的章节标题

## 结构对比

```
EPUB 结构：
├── Spine（线性顺序）
│   ├── 0: cover.html
│   ├── 1: preface.html  
│   ├── 2: chapter1.html
│   ├── 3: chapter2.html
│   ├── 4: chapter3.html
│   └── 5: appendix.html
│
└── TOC（导航目录）
    ├── 前言 → preface.html (spineIndex: 1)
    ├── 第一章 → chapter1.html (spineIndex: 2)
    ├── 第二章 → chapter2.html (spineIndex: 3)
    └── 第三章 → chapter3.html (spineIndex: 4)
    // 注意：cover.html 和 appendix.html 可能不在 TOC 中
```

## 实际差异

### Spine 包含但 TOC 不包含的内容：
- 封面页
- 版权页
- 空白页
- 附录（有时）

### TOC 的优势：
- 有意义的章节标题
- 层级结构
- 用户友好

### Spine 的优势：
- 完整的内容覆盖
- 精确的位置定位
- 程序化操作更可靠

## 在代码中的应用

### ChapterData 字段说明
```typescript
export interface ChapterData {
  id: string
  title: string
  content: string
  // 章节定位信息，用于后续打开对应书页
  spineIndex?: number // 在spine中的索引位置（主要定位方式）
  href?: string // 章节的href路径（备用定位方式和调试信息）
  tocItem?: NavItem // 原始的TOC项目信息
  depth?: number // 章节层级深度
}
```

### 为什么需要两者结合：
- 用 **TOC** 获取有意义的章节标题和结构
- 用 **Spine** 获取精确的位置索引进行定位
- `href`（来自TOC）和 `spineIndex`（来自Spine）是连接这两个系统的桥梁

### 使用示例：
```typescript
// 从 TOC 获取章节信息（标题、层级）
const toc = book.navigation.toc

// 通过 href 找到对应的 spineIndex
const spineIndex = this.getSpineIndex(book, chapterInfo.href)

// 跳转到章节（优先使用 spineIndex）
const jumpToChapter = (chapterData: ChapterData) => {
  if (chapterData.spineIndex !== undefined) {
    book.rendition.display(chapterData.spineIndex);
  } else if (chapterData.href) {
    book.rendition.display(chapterData.href);
  }
};
```

## 总结

TOC 和 Spine 是 EPUB 的两个核心组织结构：
- **TOC** 面向用户，提供导航和标题
- **Spine** 面向程序，提供精确定位
- 两者结合使用可以实现既用户友好又程序可靠的章节管理