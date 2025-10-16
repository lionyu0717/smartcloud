# SmartCloud Subtitle Export Assistant

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

1. Navigate to a SmartCloud video playback page (supports both East-West Campus and North Campus)
2. Click the extension icon in the browser toolbar
3. Select export language (Chinese/English/Bilingual)
4. Select export format (.txt/.docx/.md)
5. Click "Extract Transcript"
6. After extraction is complete, click "Export Transcript"

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
