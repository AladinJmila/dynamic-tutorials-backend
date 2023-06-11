import { renderProgressFrags, renderSlide } from './slidesEditor';

export default function featuresActions(state) {
  const featureBtns = document.querySelectorAll('.feature-btn');
  const addFeatureBtn = document.getElementById('add-feature-btn');
  const featureName = document.getElementById('feature-name');
  const note = document.getElementById('add-feature-note');

  addFeatureBtn.addEventListener('click', async () => {
    // const featuresState = document.getElementById('features-state');
    // const { selectedGroupId } = featuresState.dataset;
    const selectedGroupId = state.selectedGroup;
    if (!selectedGroupId) note.classList.add('show');

    if (selectedGroupId) {
      const res = await fetch('/features', {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: featureName.value,
          groupId: selectedGroupId,
        }),
      });

      const storedState = JSON.parse(localStorage.getItem('storedState'));

      if (res) {
        let data = await res.text();
        data = JSON.parse(data);
        console.log(data);
        console.log(data._id);
        storedState.selectThisGroup = data.groups[data.groups.length - 1];
        storedState.selectThisFeature = data._id;
        localStorage.setItem('storedState', JSON.stringify(storedState));
        location.reload();
      }
    }
  });

  featureBtns.forEach(btn => {
    btn.addEventListener('click', async function () {
      featureBtns.forEach(button => {
        button === this
          ? this.classList.toggle('active')
          : button.classList.remove('active');
      });

      const featureId = this.getAttribute('id');
      state.selectedFeature = featureId;

      const res = await fetch(`/features/${featureId}`);
      const data = await res.json();
      state.slides = data;
      renderProgressFrags(state.slides);
      renderSlide(state);
    });
  });
}
