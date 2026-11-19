// Loading photos: from the person's own files (never uploaded anywhere) or from
// the bundled sample illustrations that ship with the app.

export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ name: file.name, img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`could not read ${file.name}`));
    };
    img.src = url;
  });
}

export function loadImageUrl(url, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ name, img, url });
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

// Add photos to the state and point every empty panel at the first new photo.
export async function addPhotos(state, files) {
  const loaded = [];
  for (const file of files) loaded.push(await loadImageFile(file));
  const firstIndex = state.photos.length;
  state.photos.push(...loaded);
  for (const panel of state.panels) {
    if (panel.photoIndex >= firstIndex || state.photos[panel.photoIndex] === undefined) {
      panel.photoIndex = firstIndex;
    }
  }
  return loaded;
}

export async function addSample(state, url, name) {
  const photo = await loadImageUrl(url, name);
  const index = state.photos.length;
  state.photos.push(photo);
  return index;
}
