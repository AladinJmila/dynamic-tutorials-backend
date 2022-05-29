import groupsActions from './UI/groupsActions';
import slidesPlayer from './UI/slidesPlayer';
import slidesSketcher from './UI/slidesSketcher';
import homeDashboard from './UI/homeDashboard';
import './main.css';

const state = {
  mode: 'viewer',
  // mode: 'editor',
  loaded: false,
};

const viewerBtn = document.getElementById('viewer-btn');
const editorBtn = document.getElementById('editor-btn');
const navBtns = document.getElementById('nav-btns');

function resetNavBtnsStyle() {
  // console.log(navBtns.children);
  [...navBtns.children].forEach(el => el.classList.remove('active'));
}

viewerBtn.addEventListener('click', () => {
  state.mode = 'viewer';
  state.loaded = true;
  slidesPlayer(state);
  slidesSketcher(state);
  resetNavBtnsStyle();
  viewerBtn.classList.add('active');
});

editorBtn.addEventListener('click', () => {
  state.mode = 'editor';
  state.loaded = true;
  slidesPlayer(state);
  slidesSketcher(state);
  resetNavBtnsStyle();
  editorBtn.classList.add('active');
});

if (!/tutorials\/show$/.test(location.href)) {
  groupsActions();
  slidesPlayer(state);
  slidesSketcher(state);
}
if (/tutorials\/show$/.test(location.href)) {
  homeDashboard();
}
