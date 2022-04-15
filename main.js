import "./style.css";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/src/plugin/regions";
import { draw } from "vexchords";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
const dragArea = document.querySelector(".drag-area");
const left = document.querySelector(".left");
const dragAreaGenerate = document.querySelector(".drag-area-generate");
const dragAreaHeader = document.querySelector(".drag-area-header");
const playAudio = document.querySelector(".play-audio");
const initChordButton = document.querySelector(".init-chord");
const ffmpeg = createFFmpeg({ log: false });
let chordConfig = {
  chord: [
    [2, 3],
    [3, 3],
    [4, 3],
    [6, "x"],
  ],
  position: 5
};
let chordOptions = {
  width: 200,
  height: 240,
  defaultColor: "black",
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
let audioHtml;
let fileurl;
let audiourl;
let isPlaying = false;
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
// 生成视频和canvas对象
dragAreaGenerate.addEventListener("click", () => {
  if (videoHtml) {
    left.innerHTML = videoHtml;
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
  // 创建音频audio标签
  // audiourl = URL.createObjectURL(blob)
  // audioHtml = `<audio controls class="audio"><source src="${audiourl}"/></audio>`
  // rightDown.innerHTML = audioHtml
  // wavesurfer.load('./src/assets/guitar.mp3')
  // wavesurfer.loadBlob(blob);
  // const videoSource = document.querySelector('.video-source')
  // const video = document.querySelector('.video')
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
wavesurfer.on('region-in', showChord);
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
    const video = document.querySelector("video")
    video.play()
    // 获取当前播放位置
    video.addEventListener('timeupdate',()=>{
      console.log(video.currentTime)
      
    })
  } else {
    playAudio.innerHTML = "播放";
    wavesurfer.pause();
    document.querySelector("video").pause();
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
}
function showChord(region){
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
  updateChords(chordConfig,chordOptions)
  // 配置 初始化
  chordArr=[];
  chordConfig.position = undefined;
  chordConfig.chord = [];
}
