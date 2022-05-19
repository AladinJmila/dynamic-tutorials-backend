export default function audioPlayer(state) {
  const playBtn = document.getElementById('play-btn');
  const audio = document.querySelector('audio');
  const canvas = document.getElementById('canvas');
  const slideImg = document.getElementById('slide-img');
  const playIcon = `<i id='play-btn' class='fa fa-play'></i>`;
  const pauseIcon = `<i id='play-btn' class='fa fa-pause'></i>`;

  function playSlide() {
    if (audio.paused) {
      audio.play();
      playBtn.innerHTML = pauseIcon;
    } else {
      audio.pause();
      playBtn.innerHTML = playIcon;
    }
  }

  playBtn.addEventListener('click', playSlide);
  slideImg.addEventListener('click', playSlide);

  audio.onended = () => (playBtn.innerHTML = playBtn);

  const timeline = document.querySelector('.timeline');

  audio.ontimeupdate = () => {
    const percentagePosition = (100 * audio.currentTime) / audio.duration;
    timeline.style.backgroundSize = `${percentagePosition}% 100%`;
    timeline.value = percentagePosition;
  };

  const expandBtn = document.getElementById('expand-btn');
  const compressBtn = document.getElementById('compress-btn');
  const elem = document.documentElement;

  const contentEl = document.querySelector('.content');
  const controlsEl = document.querySelector('.slide-controls');
  const navbarEl = document.querySelector('.navbar');
  const groupsEl = document.querySelector('.groups');
  const featuresEl = document.querySelector('.features');

  expandBtn.addEventListener('click', () => {
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      /* Safari */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      /* IE11 */
      elem.msRequestFullscreen();
    }

    expandBtn.style.display = 'none';
    compressBtn.style.display = 'block';

    contentEl.style.display = 'block';
    navbarEl.style.display = 'none';
    groupsEl.style.display = 'none';
    featuresEl.style.display = 'none';
    controlsEl.style.transform = 'translateY(0)';
  });

  compressBtn.addEventListener('click', () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      /* Safari */
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      /* IE11 */
      document.msExitFullscreen();
    }

    compressBtn.style.display = 'none';
    expandBtn.style.display = 'block';

    contentEl.style.display = 'grid';
    navbarEl.style.display = 'flex';
    groupsEl.style.display = 'block';
    featuresEl.style.display = 'block';
    controlsEl.style.transform = 'translateY(-56px)';
  });

  if (state.mode === 'viewer') {
    expandBtn.style.display = 'block';
    slideImg.style.display = 'block';
    canvas.style.display = 'none';
  } else {
    expandBtn.style.display = 'none';
    slideImg.style.display = 'none';
    canvas.style.display = 'block';
  }
}