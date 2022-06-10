export default function slidesModeToggle(state) {
  const expandBtn = document.getElementById('expand-btn');
  const slideImg = document.getElementById('slide-img');
  const showNotesBtn = document.getElementById('slide-show-notes-btn');
  const notesContent = document.getElementById('notes-content');
  const controlsEl = document.querySelector('.slide-controls');
  const canvas = document.getElementById('canvas');
  const incanvasSlideName = document.getElementById('incanvas-slide-name');
  const incanvasSlideId = document.getElementById('incanvas-slide-id');
  const addSlideEl = document.querySelector('.add-slide');
  const addExistingFeaure = document.querySelector('.add-existing-feature');
  const addNotesBtn = document.getElementById('slide-add-notes-btn');
  const slideSubmitBtn = document.getElementById('slide-submit-btn');
  const notesTextarea = document.getElementById('notes-textarea');
  const notesSubmitBtn = document.getElementById('submit-notes-btn');
  const addGroupFeature = document.querySelectorAll('.add-group-feature');
  const fileInputEl = document.querySelector('.file-input');

  const hideInEditor = [expandBtn, slideImg, showNotesBtn, notesContent];
  const showInEditorFlex = [addSlideEl, addExistingFeaure, fileInputEl];
  const showInEditorBlock = [
    canvas,
    incanvasSlideName,
    incanvasSlideId,
    addNotesBtn,
    slideSubmitBtn,
    notesTextarea,
    notesSubmitBtn,
  ];

  if (state.mode === 'viewer') {
    controlsEl.classList.remove('show');
    hideInEditor.forEach(el => el.classList.remove('hide'));
    showInEditorBlock.forEach(el => el.classList.remove('show-block'));
    showInEditorFlex.forEach(el => el.classList.remove('show-flex'));
    addGroupFeature.forEach(el => {
      el.classList.remove('show-flex');
    });
  } else {
    controlsEl.classList.add('show');
    hideInEditor.forEach(el => el.classList.add('hide'));
    showInEditorBlock.forEach(el => el.classList.add('show-block'));
    showInEditorFlex.forEach(el => el.classList.add('show-flex'));
    addGroupFeature.forEach(el => {
      el.style.display = 'flex';
    });
  }
}