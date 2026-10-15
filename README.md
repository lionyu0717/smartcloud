# SmartCloud Subtitle Export Assistant

[简体中文](./README.zh-CN.md) | English

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A Chrome browser extension for exporting video subtitles from Zhejiang University's SmartCloud classroom platform. Supports exporting Chinese, English, and bilingual subtitles in multiple file formats. Compatible with both East-West Campus and North Campus course pages.

## Features

- 🎯 One-click extraction of SmartCloud video subtitles
- 🌏 Support for Chinese, English, and bilingual export
- 📄 Multiple export formats (Word, Markdown, Plain Text)
- 🏫 Compatible with both East-West Campus and North Campus course pages
- 🎨 Clean and intuitive user interface
- ⚡️ Fast response with real-time progress updates

## Installation

1. Download the Extension
   - Download the latest version from the [Releases](https://github.com/lionyu0717/smartcloud/releases) page
   - Or clone the repository and build manually:
     ```bash
     git clone https://github.com/lionyu0717/smartcloud.git
     cd smartcloud
     pnpm install
     ```

2. Install to Chrome
   - Open Chrome browser and navigate to the extensions page (`chrome://extensions/`)
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked"
   - Select the extension directory

## Usage

1. Open a SmartCloud course replay page (the redesigned `interactivemeta.cmc.zju.edu.cn` replay page, as well as the older East-West / North Campus pages)
2. Click the extension icon in the browser toolbar
3. Select export language (Chinese/English/Bilingual)
4. Select export format (.txt/.docx/.md)
5. Click "Extract Transcript"
6. After extraction is complete, click "Export Transcript" (optionally "Preview" first)

> If the course has just ended, the speech-recognition transcript may not be ready yet; try again later.

## Development Guide

### Requirements

- Node.js >= 14
- Chrome Browser

### Local Development

1. Clone the repository
   ```bash
   git clone https://github.com/lionyu0717/smartcloud.git
   ```

2. Install dependencies
   ```bash
   cd smartcloud
   pnpm install
   ```

3. Load the extension in Chrome
   - Open `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the project directory

### Project Structure

```
smartcloud/
├── src/
│   ├── popup/          # Popup window files
│   ├── content/        # Content scripts
│   └── background/     # Background scripts
├── lib/               # Third-party libraries
├── assets/           # Icons and resources
└── manifest.json     # Extension configuration
```

## Contributing

Issues and Pull Requests are welcome!

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Version History

- v1.2.0 (2026-10)
  - 🔧 Adapted to the redesigned SmartCloud replay page: the transcript is now fetched from the platform's speech-recognition API, with the old page DOM as a fallback ([#2](https://github.com/lionyu0717/smartcloud/issues/2))
  - 🐛 Fixed the export option not showing up after extraction; added a dedicated "Export Transcript" button ([#1](https://github.com/lionyu0717/smartcloud/issues/1))
  - 💾 Downloads now go through the `chrome.downloads` API and are named after the course
  - ♻️ Works on pages opened before the extension was installed (content script is injected on demand)

- v1.1.0 (2024-01)
  - ✨ Added support for North Campus course pages
  - 🔍 Automatic recognition of East-West Campus/North Campus pages
  - 📝 Display current campus location in the interface

- v1.0.0 (2024-01)
  - Basic subtitle extraction and export functionality
  - Support for Chinese, English, and bilingual export
  - Support for txt, docx, and md formats

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Acknowledgments

- [docx.js](https://github.com/dolanmiu/docx) - Word document generation library
- Zhejiang University SmartCloud Classroom Platform
