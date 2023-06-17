export default function imageUpload(state, canvas, scaleToFit) {
  const dropArea = document.getElementById('slides-body');
  const fileInput = document.getElementById('file-input');
  const slideImg = document.getElementById('slide-img');
  const imageObj = new Image();

  if (state.mode === 'editor') {
    fileInput.addEventListener('change', function () {
      const img = this.files[0];
      imageToCanvas(img);
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => {
        dropArea.classList.add('highlight');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => {
        dropArea.classList.remove('highlight');
      });
    });

    dropArea.addEventListener('drop', e => {
      const img = e.dataTransfer.files[0];
      imageToCanvas(img);
    });
  }

  function imageToCanvas(img) {
    if (/image*/.test(img.type)) {
      state.imageFile = img;

      slideImg.setAttribute(
        'style',
        `background: url("${window.URL.createObjectURL(img)}");`
      );
      console.log(slideImg);
      imageObj.src = window.URL.createObjectURL(img);
      imageObj.onload = function () {
        canvas.width = canvas.width;
        scaleToFit(this);
      };
    }
  }
}
