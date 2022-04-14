import "./style.css";
import WaveSurfer from "wavesurfer.js";
import MarkersPlugin from "wavesurfer.js/src/plugin/markers";
import RegionsPlugin from "wavesurfer.js/src/plugin/regions";
import { draw  } from 'vexchords';
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
const dragArea = document.querySelector(".drag-area");
const left = document.querySelector(".left");
const dragAreaGenerate = document.querySelector(".drag-area-generate");
const dragAreaHeader = document.querySelector(".drag-area-header");
const playAudio = document.querySelector(".play-audio");
const ffmpeg = createFFmpeg({ log: false });
// 创建音频波形图
const wavesurfer = WaveSurfer.create({
  container: ".right-down",
  waveColor: '#A8DBA8',
  progressColor: '#3B8686',
  plugins:[
    MarkersPlugin.create({
      container: ".timeline-mark",
    }),
    RegionsPlugin.create({
      regionsMinLength: 2,
      regions: [
          {
              start: 1,
              end: 3,
              loop: false,
              color: 'hsla(400, 100%, 30%, 0.5)'
          }, {
              start: 5,
              end: 7,
              loop: false,
              color: 'hsla(200, 50%, 70%, 0.4)',
              minLength: 1,
              maxLength: 5,
          }
      ],
      dragSelection: {
          slop: 5
      }
  })
  ]
});

let file;
let videoHtml;
let audioHtml;
let fileurl;
let audiourl;
let isPlaying = false;
const vaildExtension = ["video/mp4"];
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
  wavesurfer.loadBlob(blob)
};
playAudio.addEventListener("click", () => {
  isPlaying = !isPlaying;
  if (isPlaying) {
    playAudio.innerHTML = "暂停";
    // 播放音频视频
    wavesurfer.play();
    document.querySelector('video').play()
  } else {
    playAudio.innerHTML = "播放";
    wavesurfer.pause();
    document.querySelector('video').pause()
  }
});
wavesurfer.on('seek', function (position) {
  let currentTime = position * wavesurfer.getDuration();
  const video = document.querySelector('.video')
  video.currentTime = currentTime
  console.log(currentTime)
});
// 生成和弦
draw('.chord-container', {
  chord: [[1, 2], [2, 1], [3, 2], [4, 0], [5, 'x'], [6, 'x']]
},
  { width: 200, height: 240, defaultColor: 'black' }
);
wavesurfer.on('region-click', function(region, e) {
  // e.stopPropagation();
  // // Play on click, loop on shift click
  // e.shiftKey ? region.playLoop() : region.play();
  console.log(region,e)
});
console.log(wavesurfer.regions.list)