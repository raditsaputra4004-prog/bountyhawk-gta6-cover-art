// Photos: the user's own images from disk, and the two bundled samples
// the app ships with. Everything is read on the person's own machine and
// never leaves it — no upload, no network.

export const SAMPLES = [
  { id: 'sunset', label: 'Sunset skyline', src: 'samples/sample-sunset.jpg' },
  { id: 'neon', label: 'Neon street', src: 'samples/sample-neon.jpg' },
];

// Load an image from a URL (a local file under app/, or a data: URI from a
// file the user picked) and resolve with the decoded image.
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load image ${src}`));
    img.src = src;
  });
}

// Read a file the user picked in the file input into a data: URI, then
// decode it as an image.
export function loadUserFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      loadImage(reader.result).then(resolve, reject);
    };
    reader.onerror = () => reject(new Error(`could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

// Load one of the bundled samples by id.
export function loadSample(id) {
  const sample = SAMPLES.find((s) => s.id === id);
  if (!sample) return Promise.reject(new Error(`unknown sample ${id}`));
  return loadImage(sample.src);
}
