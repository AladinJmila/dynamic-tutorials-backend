const mediaEl = document.getElementById('media');
const agentInformationEl = document.getElementById('agent-information');
const navLevelTwoEl = document.getElementById('nav-level-two');
const imageEl = document.getElementById('image');
const audioEl = document.getElementById('audio');
const noteEl = document.getElementById('note');

let slides;

// injectDbData();
function genTutorialMedia(id) {
  const slide = slides.filter(slide => slide._id === id)[0];
  imageEl.innerHTML = `<img src='/image/${slide.imageURL}' alt='illustration' />`;
  audioEl.innerHTML = `<audio src='/audio/${slide.audioURL}' controls />`;
  noteEl.innerHTML = `<h4>${slide.note}</h4>`;
}

async function genNavLevelTow() {
  const res = await fetch('media/');
  const data = await res.json();
  slides = data.slides;
  const navItems = data.slides
    .map(slide => {
      return `
    <div 
    title='${slide.name}'
    id='${slide._id}'
    class='to-media col text-center border rounded text-truncate px-2 mx-2'>
    ${slide.name}
    </div>
    `;
    })
    .join('');

  navLevelTwoEl.innerHTML = navItems;

  const DomNavItems = document.querySelectorAll('.to-media');
  DomNavItems.forEach(item => {
    item.addEventListener('click', () => {
      genTutorialMedia(item.getAttribute('id'));
    });
  });
}

function injectLevelTow() {
  agentInformationEl.addEventListener('click', genNavLevelTow);
}

export default injectLevelTow;
