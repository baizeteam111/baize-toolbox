import { execFile, spawn } from "child_process";
import { app, ipcMain, BrowserWindow, dialog } from "electron";
import path, { resolve } from "path";
import { mainLogSend } from "../../helper";

const getFfmpegPath = () => {
  const basePath = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked/resources")
    : path.join(__dirname, "../../resources");
  if (process.platform === "darwin") {
    return {
      ffmpegPath: path.join(basePath, "mac/ffmpeg"),
      ffprobePath: path.join(basePath, "mac/ffprobe"),
    };
  } else {
    return {
      ffmpegPath: path.join(basePath, "win/ffmpeg"),
      ffprobePath: path.join(basePath, "win/ffprobe"),
    };
  }
};

const DEFAULT_OUTPUT_PATH = app.getPath("documents");

const { ffmpegPath, ffprobePath } = getFfmpegPath();

execFile(ffmpegPath, ["-version"], (error, stdout, stderr) => {
  if (error) {
    mainLogSend(error);
    return;
  }
  console.log(`ffmpeg 版本信息：\n${stdout}`);
});

ipcMain.on("FFMPEG_COMMAND", async (e, data) => {
  mainLogSend(`FFMPEG_COMMAND: ${ffmpegPath}`);
  mainLogSend(`FFMPEG_COMMAND: ${data.command}`);
  const videoDuration = await getFileTime(data.inputFilePath);
  const outputFilePath = path.join(
    DEFAULT_OUTPUT_PATH,
    "/output",
    data.outputFileName
  );
  const command = [...data.command, outputFilePath];
  const ffmpegProcess = spawn(ffmpegPath, command);
  const taskId = data.taskId;
  const sendFunc = (params) => {
    BrowserWindow.fromWebContents(e.sender)?.webContents.send(
      `FFMPEG_PROGRESS_${taskId}`,
      params
    );
  };

  ffmpegProcess.stderr.on("data", (data) => {
    const result = data.toString();
    const match = result.match(/time=([0-9:.]+)/);
    if (match && match[1]) {
      const currentTime = convertTimeToSeconds(match[1]);
      const progress = ((currentTime / videoDuration) * 100).toFixed(2);
      console.log(`Progress: ${progress}%`);
      sendFunc({
        progress: Number(progress),
      });
    }
  });

  ffmpegProcess.on("close", (code) => {
    if (code !== 0) {
      console.error(`FFmpeg 进程关闭，但出现错误，退出码 ${code}`);
      sendFunc({
        error: code,
      });
    } else {
      console.log("FFmpeg 进程正常关闭");
      sendFunc({
        progress: 100,
      });
    }
  });
});

const getFileTime = async (videoFilePath): Promise<number> => {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        videoFilePath,
      ],
      (error, stdout, stderr) => {
        if (error) {
          console.error(`执行出错: ${error.message}`);
          mainLogSend({ error, ffprobePath });
          reject(error);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        // 解析 ffprobe 的输出，得到视频时长（以秒为单位）
        const duration = parseFloat(stdout);
        console.log(`视频时长: ${duration} 秒`);
        resolve(duration);
      }
    );
  });
};

function convertTimeToSeconds(timeStr) {
  const [hours, minutes, seconds] = timeStr.split(":").map(parseFloat);
  return hours * 3600 + minutes * 60 + seconds;
}