<p align="center">
  <a href="https://ebook2me.mind-elixir.com/" target="_blank" rel="noopener noreferrer">
    <img width="150" src="/public/icon.png" alt="E-book to Mind Map logo">
  </a>
  <h1 align="center">E-book to Mind Map</h1>
</p>

[中文](README.md) | English

![E-book to Mind Map Screenshot1](/img/screenshot1.jpg)

An intelligent e-book parsing tool powered by AI technology that converts EPUB and PDF format e-books into structured mind maps and text summaries.

Try it now: https://ebook2me-next.mind-elixir.com/

[Use Legacy Version](https://ebook2me.mind-elixir.com/)

## ✨ Features

### 📚 Multi-format Support

- **EPUB Files**: Complete support for parsing and processing EPUB format e-books
- **PDF Files**: Intelligent PDF document parsing with table of contents-based and smart chapter extraction

### 🤖 AI-Powered Content Processing

- **Multiple AI Services**: Support for Google Gemini and OpenAI GPT models
- **BYOK Mode**: Requires using your own API Key (Bring Your Own Key), ensuring data security and privacy
- **Direct Local Connection**: All AI requests are made directly from your browser to the AI providers, never through any third-party proxy or intermediary servers
- **Three Processing Modes**:
  - 📝 **Text Summary Mode**: Generate chapter summaries, analyze chapter relationships, output complete book summary
  - 🧠 **Chapter Mind Map Mode**: Generate independent mind maps for each chapter
  - 🌐 **Whole Book Mind Map Mode**: Integrate entire book content into one comprehensive mind map

### 💾 Efficient Caching Mechanism

- **Smart Caching**: Automatically cache AI processing results, allowing continuation from the last position if processing is interrupted
- **Cache Management**: Support clearing cache by mode to save storage space
- **Offline Viewing**: Processed content can be viewed offline

### 🎨 Modern Interface

- **Responsive Design**: Adapts to various screen sizes
- **Real-time Progress**: Visualized processing with real-time step display
- **Interactive Mind Maps**: Support zooming, dragging, node expand/collapse
- **Content Preview**: Support viewing original chapter content

## 📖 User Guide

### 1. Configure AI Service

First-time use requires AI service configuration:

> **🔒 Privacy Protection Note**: This tool uses the BYOK (Bring Your Own Key) mode, requiring you to use your own API Key. All AI requests are made directly from your browser to the AI providers (Google or OpenAI), never through any third-party proxy or intermediary servers, ensuring your data security and privacy.

1. Click the "Configure" button
2. Select AI service provider, **Google Gemini** is recommended for trial
3. Enter the corresponding API Key
4. Fill in the model

#### Getting API Keys

Using **Google Gemini** as an example:

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API Key
4. Copy the API Key to configuration

For more information on AI provider options, refer to: [Free and Paid AI API Selection Guide](https://ssshooter.com/en/ai-services-guide/)

### 2. Upload E-book File

1. Click "Select EPUB or PDF File" button
2. Choose the e-book file to process
3. Supported formats: `.epub`, `.pdf`

You can get free e-books from websites like [Project Gutenberg](https://www.gutenberg.org/) and [Standard Ebooks](https://standardebooks.org/).

### 3. Configure Processing Options

Set processing parameters in the configuration dialog:

#### Processing Mode

- **Text Summary Mode**: Suitable for scenarios requiring text summaries
- **Chapter Mind Map Mode**: Generate independent mind maps for each chapter
- **Whole Book Mind Map Mode**: Generate unified mind map for the entire book (may fail due to insufficient model context if the book content is too long)

#### Book Type

- **Fiction**: Suitable for novels and story books
- **Non-fiction**: Suitable for textbooks, reference books, technical books, etc.

#### Advanced Options

- **Smart Chapter Detection**: When enabled, uses AI to intelligently identify chapter boundaries
- **Skip Irrelevant Chapters**: Automatically skip prefaces, table of contents, acknowledgments, etc.
- **Sub-chapter Depth**: Set the hierarchy depth for extracting sub-chapters (0-3)

### 4. Extract Chapters

1. Click "Extract Chapters" button
2. System will automatically parse the file and extract chapter structure
3. After extraction, chapter list will be displayed
4. You can select chapters to process

#### Chapter Grouping (Optional)

For books with comprehensive content, you can merge multiple small chapters into a group for processing, allowing for a more structured result. By grouping, AI will analyze the content of these chapters together.

1. **Select Chapters**: Click on a chapter list item (not the checkbox area) to select it. Multiple selection is supported. Selected chapters will have a highlighted border.
2. **Add Tag**:
   - Click the "Add Tag" button at the top of the list
   - Or use the shortcut `Ctrl + G`
3. **Enter Group Name**: In the dialog that appears, enter a group name (e.g., "Part 1", "Chapter 1", etc.). After confirmation, the selected chapters will be marked as the same group.
4. **Remove Group**: Click the "X" icon after the existing tag on the chapter list to remove the grouping for that chapter.

### 4.5. Custom Prompts (Advanced)

You can manage your dedicated prompts on the "Custom Prompts" page and use them when processing books to get results that better fit your needs.

1. **Manage Prompts**:

   - Click "Custom Prompts" in the navigation bar to enter the management page
   - Click "Add Prompt" to create a new prompt template
   - Fill in the name, description, and specific prompt content
   - Support editing, copying, and deleting existing prompts

2. **Use Prompts**:
   - At the bottom of the configuration interface after extracting chapters, find the "Custom Prompts" option
   - Select your pre-created prompt from the dropdown menu
   - **Use Custom Prompt Only**: When checked, your prompt will completely replace the system default prompt (this option only applies to **Text Summary Mode**). If unchecked, your prompt will be sent to the AI as supplementary instructions.

### 5. Start Processing

1. Confirm selected chapters
2. Click "Start Processing" button
3. System will display processing progress and current steps
4. Results will be shown after completion

### 6. View Results

Depending on the selected processing mode, you can view different types of results:

#### Text Summary Mode

- **Chapter Summaries**: Detailed summary of each chapter
- **Chapter Relationships**: Analysis of logical relationships between chapters
- **Book Summary**: Core content summary of the entire book

#### Mind Map Mode

- **Interactive Mind Maps**: Zoomable, draggable mind maps
- **Node Details**: Click nodes to view detailed content
- **Export Function**: Support exporting as images or other formats

## 🛠️ Technical Architecture

### Core Technology Stack

- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **File Parsing**:
  - EPUB: @smoores/epub + epubjs
  - PDF: pdfjs-dist
- **Mind Maps**: mind-elixir
- **AI Services**:
  - Google Gemini: @google/generative-ai
  - OpenAI: Custom implementation

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Thanks to the following open source projects:

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [mind-elixir](https://github.com/ssshooter/mind-elixir-core)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [epub.js](https://github.com/futurepress/epub.js/)

---

For questions or suggestions, please submit an Issue or contact the developer (WeChat👇)

<img width="220" alt="WeChat" src="/img/wechat.JPG" />
