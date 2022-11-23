const fs = require('fs-extra');
const path = require('path');
const download = require('download');
const m3u8Parser = require('m3u8-parser');

const M3U8_URL = '';
const OUTPUT_DIR = 'output';

const downloadM3u8 = async () => {
    const m3u8OutputPath = path.resolve(__dirname, OUTPUT_DIR, 'index.m3u8');
    await fs.ensureDir(path.resolve(__dirname, OUTPUT_DIR));
    await fs.writeFile(m3u8OutputPath, await download(M3U8_URL));
    return m3u8OutputPath;
};

const parseM3u8 = async (filePath) => {
    const m3u8Content = await fs.readFile(filePath, 'utf-8');
    const parser = new m3u8Parser.Parser();
    parser.push(m3u8Content);
    parser.end();
    return parser.manifest;
};
