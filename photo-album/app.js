(() => {
  const STORAGE_KEY = 'vacationAlbum.v1';
  const MAX_DIMENSION = 1600;
  const JPEG_QUALITY = 0.85;

  const grid = document.getElementById('grid');
  const albumTitle = document.getElementById('albumTitle');
  const albumSubtitle = document.getElementById('albumSubtitle');
  const fileInput = document.getElementById('fileInput');
  const addPhotosBtn = document.getElementById('addPhotosBtn');
  const printBtn = document.getElementById('printBtn');
  const resetBtn = document.getElementById('resetBtn');
  const dropzone = document.getElementById('dropzone');
  const cardTemplate = document.getElementById('cardTemplate');

  let state = loadState();
  let draggedId = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Could not load saved album', e);
    }
    return { title: '', subtitle: '', photos: [] };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save album (storage may be full)', e);
    }
  }

  function uid() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const scale = MAX_DIMENSION / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    for (const file of files) {
      try {
        const src = await resizeImage(file);
        state.photos.push({ id: uid(), src, caption: '' });
      } catch (e) {
        console.warn('Skipped file', file.name, e);
      }
    }
    saveState();
    render();
  }

  function render() {
    albumTitle.value = state.title || '';
    albumSubtitle.value = state.subtitle || '';

    grid.innerHTML = '';
    for (const photo of state.photos) {
      const node = cardTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.id = photo.id;
      const img = node.querySelector('.card-img');
      img.src = photo.src;
      const caption = node.querySelector('.card-caption');
      caption.value = photo.caption || '';

      caption.addEventListener('input', () => {
        photo.caption = caption.value;
        saveState();
      });

      node.querySelector('.card-remove').addEventListener('click', () => {
        state.photos = state.photos.filter((p) => p.id !== photo.id);
        saveState();
        render();
      });

      node.addEventListener('dragstart', () => {
        draggedId = photo.id;
        node.classList.add('dragging');
      });
      node.addEventListener('dragend', () => {
        node.classList.remove('dragging');
        draggedId = null;
      });
      node.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (photo.id !== draggedId) node.classList.add('drag-over');
      });
      node.addEventListener('dragleave', () => node.classList.remove('drag-over'));
      node.addEventListener('drop', (e) => {
        e.preventDefault();
        node.classList.remove('drag-over');
        if (!draggedId || draggedId === photo.id) return;
        reorder(draggedId, photo.id);
      });

      grid.appendChild(node);
    }
  }

  function reorder(draggedId, targetId) {
    const fromIndex = state.photos.findIndex((p) => p.id === draggedId);
    const toIndex = state.photos.findIndex((p) => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = state.photos.splice(fromIndex, 1);
    state.photos.splice(toIndex, 0, moved);
    saveState();
    render();
  }

  albumTitle.addEventListener('input', () => {
    state.title = albumTitle.value;
    saveState();
  });
  albumSubtitle.addEventListener('input', () => {
    state.subtitle = albumSubtitle.value;
    saveState();
  });

  addPhotosBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    addFiles(e.target.files);
    fileInput.value = '';
  });

  printBtn.addEventListener('click', () => {
    document.title = (state.title || 'Album de vacances').trim();
    window.print();
  });

  resetBtn.addEventListener('click', () => {
    if (confirm("Effacer l'album entier (titre, photos et légendes) ? Cette action est irréversible.")) {
      state = { title: '', subtitle: '', photos: [] };
      saveState();
      render();
    }
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    document.body.addEventListener(evt, (e) => e.preventDefault());
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    e.stopPropagation();
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });
  document.body.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });

  render();
})();
