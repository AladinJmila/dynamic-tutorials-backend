export default function groupsActions(state) {
  const dropdownBtns = document.querySelectorAll('.dropdown-btn');
  const dropdownContainers = document.querySelectorAll('.dropdown-container');
  const groupsNames = Array.from(document.querySelectorAll('.group-name'));
  const addGroupBtns = Array.from(document.querySelectorAll('.add-group-btn'));
  const selectedGroupNameEl = document.getElementById('selected-group-name');
  const featuresColletctions = document.querySelectorAll(
    '.features-collection'
  );

  function renderDropdown() {
    dropdownContainers.forEach((el, i) => {
      if (el.children.length > 1) {
        dropdownBtns[i].classList.add('dropdown');
      } else {
        dropdownBtns[i].classList.remove('dropdown');
      }
    });
  }
  renderDropdown();
  handleStoredState();

  dropdownBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      dropdownBtns.forEach(button => {
        button === this
          ? this.classList.toggle('active')
          : button.classList.remove('active');
      });

      const featuresState = document.getElementById('features-state');
      const { selectedGroupId } = featuresState.dataset;
      if (
        selectedGroupId === this.dataset.groupId ||
        !this.classList.contains('active')
      ) {
        state.selectedGroup = null;
        selectedGroupNameEl.innerText = 'select a group';
      } else {
        state.selectedGroup = this.dataset.groupId;
        selectedGroupNameEl.innerText = this.dataset.groupName;
      }

      featuresColletctions.forEach(fc => {
        fc.dataset.groupId === state.selectedGroup
          ? (fc.style.display = 'flex')
          : (fc.style.display = 'none');
      });

      const note = document.getElementById('add-feature-note');
      note.classList.remove('show');
      const dropdownContent = this.nextElementSibling;
      if (dropdownContent) {
        dropdownContent.style.display === 'block'
          ? (dropdownContent.style.display = 'none')
          : (dropdownContent.style.display = 'block');
      }
    });
  });

  addGroupBtns.forEach((btn, i) => {
    btn.addEventListener('click', async function () {
      const name = groupsNames[i].value;
      const appId = groupsNames[i].dataset.appId;
      const parentGroupId = groupsNames[i].dataset.groupId;
      if (name) {
        const res = await fetch('/groups', {
          method: 'post',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            application: appId,
            parentGroupId,
          }),
        });

        const storedState = JSON.parse(localStorage.getItem('storedState'));

        if (res) {
          let data = await res.text();
          data = JSON.parse(data);
          console.log(data);
          console.log(data._id);
          storedState.lastAddedGroup = data._id;
          localStorage.setItem('storedState', JSON.stringify(storedState));
          location.reload();
        }
      }
    });
  });

  function handleStoredState() {
    let storedState = JSON.parse(localStorage.getItem('storedState'));
    if (!storedState) {
      localStorage.setItem('storedState', '{}');
      storedState = JSON.parse(localStorage.getItem('storedState'));
    } else {
      const lastAddedGroupBtn = document.getElementById(
        storedState.lastAddedGroup
      );
      if (lastAddedGroupBtn) {
        setTimeout(() => {
          lastAddedGroupBtn.click();
          storedState.lastAddedGroup = '';
          localStorage.setItem('storedState', JSON.stringify(storedState));
        }, 300);
      }
    }
    return storedState;
  }
}
