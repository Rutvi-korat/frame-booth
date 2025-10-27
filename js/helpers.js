// ==================================================================
//    HELPER UTILITIES
// ==================================================================
import { mockupArea, bgColor, docWidth, docHeight } from './ui.js';
import { resizeKonvaStage } from './konvaSetup.js';

/**
 * Loads an image from a given source URL.
 * @param {string} src The URL of the image to load.
 * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded image element.
 */
export const loadImage = src => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
});

/**
 * Reads a local file (e.g., from an <input type="file">) as a Data URL.
 * @param {File} file The file object to read.
 * @returns {Promise<string>} A promise that resolves with the file's content as a Data URL string.
 */
export const readFileAsDataURL = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File could not be read.'));
    reader.readAsDataURL(file);
});

export function updateMockupBackground() {
    mockupArea.style.backgroundColor = bgColor.value || "#ffffff";
}

export function resizeDocument() {
    const w = +docWidth.value || 900;
    const h = +docHeight.value || 600;

    mockupArea.style.width = `${w}px`;
    mockupArea.style.height = `${h}px`;
    
    resizeKonvaStage?.();
}