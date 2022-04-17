import "./style.css";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/src/plugin/regions";
import { draw } from "vexchords";
import svg64 from "svg64";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
const dragArea = document.querySelector(".drag-area");
const left = document.querySelector(".left");
const leftTop = document.querySelector(".left-top");
const canvas = document.querySelector(".canvas");
const ctx = canvas.getContext("2d");
const dragAreaGenerate = document.querySelector(".drag-area-generate");
const dragAreaHeader = document.querySelector(".drag-area-header");
const playAudio = document.querySelector(".play-audio");
const initChordButton = document.querySelector(".init-chord");
const generateVideo = document.querySelector(".generate-video");
const ffmpeg = createFFmpeg({ log: true });
let chordConfig = {
  chord: [
    [2, 3],
    [3, 3],
    [4, 3],
    [6, "x"],
  ],
  position: 5,
};
let chordOptions = {
  width: 200,
  height: 240,
  defaultColor: "#809BFF",
};
// 创建音频波形图
const wavesurfer = WaveSurfer.create({
  container: ".right-down",
  waveColor: "#A8DBA8",
  progressColor: "#3B8686",
  plugins: [
    RegionsPlugin.create({
      regionsMinLength: 2,
      dragSelection: {
        slop: 5,
      },
    }),
  ],
});

let file;
let videoHtml;
let fileurl;
let isPlaying = false;
let videoDuration;
let audioBlob;
const vaildExtension = ["video/mp4"];
initChordButton.addEventListener("click", () => {
  updateChords(chordConfig, chordOptions);
});
dragArea.addEventListener("dragover", (event) => {
  event.preventDefault();
});
dragArea.addEventListener("drop", (event) => {
  event.preventDefault();
  // 防止用户一次性拖拽多个文件
  file = event.dataTransfer.files[0];
  if (vaildExtension.includes(file.type)) {
    let fileReader = new FileReader();
    fileReader.onload = () => {
      fileurl = fileReader.result;
      videoHtml = `<video  muted class="video"><source class="video-source" src="${fileReader.result}" type="video/mp4" /></video>`;
      dragAreaHeader.innerHTML = "上传成功，点击生成视频吧!";
    };
    fileReader.readAsDataURL(file);
  }
});
// 生成视频
dragAreaGenerate.addEventListener("click", () => {
  if (videoHtml) {
    leftTop.innerHTML = videoHtml;
    transcode();
  }
});
const transcode = async () => {
  const { name } = file;
  await ffmpeg.load();
  ffmpeg.FS("writeFile", name, await fetchFile(file));
  await ffmpeg.run("-i", name, "guitar.mp3");
  const data = ffmpeg.FS("readFile", "guitar.mp3");
  const blob = new Blob([data.buffer], { type: "audio/mp3" });
  console.log(`data:${data}`);
  console.log(`bolb:${blob}`);
  audioBlob = blob;
  wavesurfer.loadBlob(blob);
};
playAudio.addEventListener("click", playVideoAudio);
wavesurfer.on("seek", function (position) {
  updateVideoTimeIfSeek(position);
});
wavesurfer.on("region-click", function (region, e) {
  e.stopPropagation();
  // // Play on click, loop on shift click
  e.shiftKey ? region.playLoop() : region.play();
  const startTime = region.start;
  const endTime = region.end;
  console.log(`开始时间${startTime} 结束时间${endTime}`);
  // 更新视频的起始位置
  updateVideoTimeIfClick(startTime);
  // 播放视频
  playVideoAudio();
});
wavesurfer.on("region-dblclick", (region, e) => {
  region.remove();
});
wavesurfer.on("region-click", editAnnotation);
wavesurfer.on("region-in", showChord);
function updateVideoTimeIfSeek(position) {
  let currentTime = position * wavesurfer.getDuration();
  const video = document.querySelector(".video");
  video.currentTime = currentTime;
}
function updateVideoTimeIfClick(startTime) {
  const video = document.querySelector(".video");
  video.currentTime = startTime;
}
function playVideoAudio() {
  isPlaying = !isPlaying;
  if (isPlaying) {
    playAudio.innerHTML = "暂停";
    // 播放音频视频
    wavesurfer.play();
    var video = document.querySelector(".video");
    video.play();
    videoDuration = video.duration;
    let cw = video.videoWidth;
    let ch = video.videoHeight;
    console.log(cw, ch);
    canvas.width = cw + 200;
    canvas.height = ch;
    video.addEventListener(
      "play",
      () => {
        videoDrawCanvas(video, ctx, cw, ch);
      },
      false
    );
  } else {
    playAudio.innerHTML = "播放";
    wavesurfer.pause();
    document.querySelector(".video").pause();
  }
}

function editAnnotation(region) {
  let form = document.forms.edit;
  console.log(form);
  form.elements.start.value = Math.round(region.start * 10) / 10;
  form.elements.end.value = Math.round(region.end * 10) / 10;
  form.elements.note.value = region.data.note || "";
  form.onsubmit = function (e) {
    e.preventDefault();
    region.update({
      start: form.elements.start.value,
      end: form.elements.end.value,
      data: {
        note: form.elements.note.value,
      },
    });
  };
}
function updateChords(chordConfig, chordOptions) {
  const chordContainer = document.querySelector(".chord-container");
  chordContainer.innerHTML = "";
  draw(".chord-container", chordConfig, chordOptions);
  // 得到SVG元素
  const svgEl = chordContainer.getElementsByTagName("svg");
  const base64fromSVG = svg64(svgEl[0]);
  const imgUpload = new Image();
  imgUpload.onload = function () {
    // 绘制和弦到canvas
    console.log("开始绘制");
    let video = document.querySelector(".video");
    let cw = video.videoWidth;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgUpload, cw, 0);
  };
  imgUpload.src = base64fromSVG;
}
function showChord(region) {
  // 通过提交的note 计算chordconfig 和 chordOptions 3(2,1,4,3,2,0) 一弦2品、二弦1品
  let note = region.data.note;
  chordConfig.position = note[0];
  let chord = note.slice(2, 13).split(","); // [2,1,4,3,2,X]
  // 遍历生成数组
  let chordArr = [];
  for (let i = 0; i < chord.length; i++) {
    if (chord[i] === "X" || chord[i] === "x") {
      chordArr.push([i + 1, "x"]);
    } else {
      // 下标0 对应1弦
      chordArr.push([i + 1, chord[i]]);
    }
  }
  chordConfig.chord = chordArr;
  // 此处拿到了表单提交后chordConfig，根据这个chordConfig来生成和弦
  updateChords(chordConfig, chordOptions);
  // 配置 初始化
  chordArr = [];
  chordConfig.position = undefined;
  chordConfig.chord = [];
}
function videoDrawCanvas(video, ctx, cw, ch) {
  ctx.drawImage(video, 0, 0);
  setTimeout(videoDrawCanvas, 20, video, ctx, cw, ch);
}
// 保存视频

const stream = canvas.captureStream();
const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
const data = [];
recorder.ondataavailable = function (event) {
  if (event.data && event.data.size) {
    data.push(event.data);
  }
};
recorder.onstop = () => {
  console.log("视频录制完毕，准备与音频数据相结合");
  // 视频 blob
  const videoBlob = data[0];

  combineVideoAudio(videoBlob, audioBlob);

};
generateVideo.addEventListener("click", () => {
  // 更新视频起始位置
  updateVideoTimeIfClick(0)
  const video = document.querySelector('.video')
  video.play()
  // 播放视频和音频
  wavesurfer.stop()
  wavesurfer.play()
  
  
  recorder.start();
  setTimeout(() => {
    recorder.stop();
  }, videoDuration * 1000);
});
const combineVideoAudio = async (videoBlob, audioBlob) => {
  console.log("开始音视频结合");
  const dataInputVideo = await fetchFile(videoBlob);
  const dataInputAudio = await fetchFile(audioBlob);
  ffmpeg.FS('writeFile', 'video.mp4', dataInputVideo);
  ffmpeg.FS('writeFile', 'aduio.mp3', dataInputAudio);
  await ffmpeg.run('-i', 'video.mp4', '-i','aduio.mp3', '-c:v', 'copy', '-c:a', 'mp3', '-strict', 'experimental', '-map', '0:v:0', '-map', '1:a:0', 'output.mkv');
  const data = ffmpeg.FS('readFile', 'output.mkv');
  console.log(data);
  console.log("结束音视频结合");
  const newBlob = new Blob([data.buffer], { type: "video/mp4" });
  const href = URL.createObjectURL(newBlob);
  const a = document.createElement("a");
  a.setAttribute("href", href);
  a.setAttribute("style", "display:none");
  a.download = 'output.mp4';
  document.body.appendChild(a);
  a.click();
  a.parentNode.removeChild(a);
  URL.revokeObjectURL(href);
  console.log("下载完毕");
};
