# Audio pitch extraction tool

音频音高提取工具，在波形中提取出音高，转换成MIDI文件。

对于简单的音频（像是口哨这样的）提取效果很不错。

写这个小工具用到了以下项目：

- [cwilso/PitchDetect](https://github.com/cwilso/PitchDetect)：转换代码有很大一部分从此处借鉴。
- [grimmdude/MidiWriterJS](https://github.com/grimmdude/MidiWriterJS)：用于创建保存MIDI文件。
