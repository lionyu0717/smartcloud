# SmartCloud Subtitle Export Assistant

[简体中文](./README.zh-CN.md) | English

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A Chrome / Edge extension for exporting study materials from Zhejiang University's SmartCloud classroom platform: lecture transcripts (Chinese, English or bilingual, with optional timestamps or as SRT subtitles), the PPT screenshots merged into a PDF, and the original PPT courseware file.

> **Disclaimer: this extension is for personal study and academic exchange only. Do not use it for commercial purposes.** It only reads materials from course pages you are logged in to and allowed to access, never bypasses access control, and never uploads any data to third-party servers. Please follow Zhejiang University's rules and respect the instructors' copyright.

## Features

- 🎯 One-click extraction of lecture transcripts in Chinese, English, or bilingual
- 📄 Export as Word, Markdown, plain text, or SRT subtitles
- ⏱️ Optional per-paragraph timestamps; file names and titles include the course name, instructor, and lecture time
- 🖼️ Export the PPT screenshots as a PDF, merging the duplicate shots produced by animations and handwriting
- 📥 Download the original PPT courseware file (generation is triggered and awaited automatically if needed)
- 📒 Illustrated notes: each slide followed by what the instructor said while it was shown, exportable as Word, Markdown (ZIP), or PDF via print
- 🏫 Works on the redesigned replay page as well as the older East-West / North Campus pages

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
3. The popup shows the current course name, instructor, and lecture time at the top

**Transcript**

1. Choose the language (Chinese/English/Bilingual) and format (.txt/.docx/.md/.srt); tick "timestamps" if needed
2. Click "Extract Transcript", then optionally "Preview"
3. Click "Export"

**PPT**

- **Export PPT screenshots (PDF)**: merges the PPT frames SmartCloud captured during the lecture into one PDF. "Merge duplicate screenshots" is on by default, keeping only the most complete shot of a slide that was captured several times because of animations or handwriting.
- **Download original courseware**: downloads the original PPT file. If it has not been generated yet, the extension triggers generation (like the "Export courseware" button on the SmartCloud website) and checks every 10 seconds; long lectures may take a few minutes. Use the screenshot PDF when no original courseware is available.

**Illustrated notes**

Click "Generate illustrated notes" and a new tab aligns the PPT screenshots with the transcript by time: each slide is followed by what the instructor said while it was on screen, and slides the instructor returns to are marked as revisited. In the notes tab you can switch the transcript language, timestamps, and screenshot merging, then:

- **Download Word**: images and text in one .docx, ready for further note-taking
- **Download Markdown (ZIP)**: a .md file plus an images folder, for Obsidian, Typora, etc.
- **Print / Save as PDF**: uses the browser's print dialog; choose "Save as PDF" as the destination

> Keep the popup open while exporting. Transcripts and screenshots of a lecture that just ended may not be ready yet; try again later.

## Development Guide

### Requirements

- Node.js >= 18 (only needed for running tests)
- Chrome Browser

### Local Development

1. Clone the repository
   ```bash
   git clone https://github.com/lionyu0717/smartcloud.git
   ```

2. Run the unit tests (Node.js 18+)
   ```bash
   cd smartcloud
   npm test
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
│   ├── popup/          # Popup (format.js: transcript formatting, slides.js: screenshot de-duplication, notes.js: slide/transcript alignment, media.js: screenshot loading)
│   ├── notes/          # Illustrated notes page
│   ├── content/        # Content scripts
│   └── background/     # Background scripts
├── lib/               # Third-party libraries (docx, jsPDF, JSZip)
├── tests/             # Unit tests
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

- v1.4.0 (2026-10)
  - 📒 Illustrated notes: PPT screenshots aligned with the transcript, exportable as Word, Markdown (ZIP), or PDF via print

- v1.3.0 (2026-10)
  - 🖼️ Export PPT screenshots as PDF with automatic de-duplication
  - 📥 Download the original PPT courseware
  - ⏱️ Timestamps and SRT export for transcripts
  - 🏷️ Course info in the popup, file names, and document titles

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
- [jsPDF](https://github.com/parallax/jsPDF) - PDF generation library
- [JSZip](https://github.com/Stuk/jszip) (used under the MIT license) - ZIP packaging
- [ZYNotes](https://github.com/Auspiow/zhiyun-extension) - the idea of slide-plus-transcript notes (no code used)
- [zju-learning-cli](https://github.com/geniucker-dev/zju-learning-cli) (MIT) - inspiration for the screenshot de-duplication algorithm and SmartCloud API reference
- [ZJU-Course-Desktop](https://github.com/huharvey/ZJU-Course-Desktop), [Edgeless](https://github.com/StephenChen1108/edgeless-zju-transcript-exporter) - reference for the courseware export API
- Zhejiang University SmartCloud Classroom Platform
