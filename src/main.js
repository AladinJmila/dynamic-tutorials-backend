import groupsActions from './UI/groupsActions';
import slidesActions from './UI/slidesActions';
import homeActions from './UI/homeActions';
import './main.css';
import featuresActions from './UI/featruesActions';
import { sendSlide, renderSlide } from './UI/slidesEditor';
import slideToDb from './UI/slideToDb';

const state = {
  mode: '',
  loaded: false,
  slideSent: false,
  audioBlob: null,
  imageFile: null,
  editedImage: null,
  selectedGroup: null,
  selectedFeature: null,
  selectedSlide: null,
  slides: [],
  playCounter: 0,
};

const viewerBtn = document.getElementById('viewer-btn');
const editorBtn = document.getElementById('editor-btn');
const navBtns = document.getElementById('nav-btns');

function resetNavBtnsStyle() {
  [...navBtns.children].forEach(el => el.classList.remove('active'));
}

viewerBtn.addEventListener('click', setViewerMode);

function setViewerMode() {
  state.mode = 'viewer';
  state.loaded = true;
  slidesActions(state);
  resetNavBtnsStyle();
  viewerBtn.classList.add('active');
}

editorBtn.addEventListener('click', setEditorMode);

function setEditorMode() {
  state.mode = 'editor';
  state.loaded = true;
  slidesActions(state);
  resetNavBtnsStyle();
  editorBtn.classList.add('active');
}

if (!/tutorials\/show$/.test(location.href)) {
  groupsActions(state);
  featuresActions(state);
  slidesActions(state);
  setEditorMode();
  sendSlide(state);
  renderSlide(state);
  slideToDb(state);
}
if (/tutorials\/show$/.test(location.href)) {
  homeActions();
}

window.addEventListener('DOMContentLoaded', handleStoredState);

function handleStoredState() {
  let storedState = JSON.parse(localStorage.getItem('storedState'));
  if (!storedState) {
    localStorage.setItem('storedState', '{}');
    storedState = JSON.parse(localStorage.getItem('storedState'));
  } else {
    if (state.mode === 'editor') {
      if (storedState.selectThisGroup) {
        const groupBtn = document.getElementById(storedState.selectThisGroup);

        setTimeout(() => {
          groupBtn.click();
          // storedState.selectThisGroup = '';
          // localStorage.setItem('storedState', JSON.stringify(storedState));
        }, 300);
      }

      if (storedState.selectThisFeature) {
        const featureBtn = document.getElementById(
          storedState.selectThisFeature
        );

        setTimeout(() => {
          featureBtn.click();
          // storedState.selectThisFeature = '';
          // localStorage.setItem('storedState', JSON.stringify(storedState));
        }, 300);
      }

      if (storedState.selectThisSlide) {
        setTimeout(() => {
          const slideBtn = document.getElementById(storedState.selectThisSlide);

          slideBtn && slideBtn.click();
        }, 300);
      }
    }
  }
}

// setTimeout(() => {
//   const target = document.querySelector('.core-search__content');

//   console.log(target.getBoundingClientRect());
//   console.log(target.parentElement);
// }, 5000);
