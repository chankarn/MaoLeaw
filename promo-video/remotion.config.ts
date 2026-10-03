import { Config } from '@remotion/cli/config';

// Use the locally installed Chrome instead of downloading chrome-headless-shell.
Config.setBrowserExecutable('C:/Program Files/Google/Chrome/Application/chrome.exe');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
