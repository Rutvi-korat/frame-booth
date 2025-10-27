// ==========================================================================
// APPLICATION ENTRY POINT
// ==========================================================================

import * as UI from './ui.js';
import * as Helpers from './helpers.js';
import { AppState, frames } from './state.js';
import { initKonva, addMockup, lastAddedMockup, tr } from './konvaSetup.js';
import { initExport } from './export.js';

// ==========================================================================
// INITIALIZATION - initializeApp()
// ==========================================================================
async function initializeApp() {
    // --- Perform initial UI setup ---
    const groupedFrames = frames.reduce((acc, frame) => {
        (acc[frame.group] = acc[frame.group] || []).push(frame);
        return acc;
    }, {});

    Object.keys(groupedFrames).forEach(groupName => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = groupName;
        groupedFrames[groupName].forEach(frame => {
            const option = new Option(frame.name, frame.id);
            optgroup.appendChild(option);
        });
        UI.frameSelect.appendChild(optgroup);
    });
    if (UI.frameSelect.options.length > 0) {
        UI.frameSelect.options[0].selected = true;
    }
    // Set responsive default canvas size for mobile
    if (window.innerWidth <= 768) { 
        UI.docWidth.value = 350; 
        UI.docHeight.value = 600;
    }

    Helpers.updateMockupBackground();
    Helpers.resizeDocument();

    // --- Initialize modules ---
    initKonva();
    initExport();
    initZoomPanControls();

    // --- Add the default frame ---
    await addMockup();

    // --- Bind event listeners ---
    UI.bgColor.addEventListener('input', Helpers.updateMockupBackground);
    UI.docWidth.addEventListener('input', Helpers.resizeDocument);
    UI.docHeight.addEventListener('input', Helpers.resizeDocument);
    UI.uploadBtn.addEventListener('click', () => UI.fileInput.click());
    UI.fileInput.addEventListener('change', handleImageUpload);
    UI.addFrameBtn.addEventListener('click', addMockup);
    UI.updateFrameBtn.addEventListener('click', handleFrameSwap);

    // --- Start background rendering ---
    renderBackground();
}

window.addEventListener('DOMContentLoaded', initializeApp);


// ==========================================================================
// ZOOM & PAN CONTROLS - initZoomPanControls()
// ==========================================================================
function initZoomPanControls() {
    const previewWrap = document.querySelector('.preview-wrap');
    const mockupArea = UI.mockupArea;

    let scale = 1;
    let panX = 0;
    let panY = 0;
    let isPanningWithSpace = false;
    let isSpaceDown = false;
    let panStart = { x: 0, y: 0 };
    let lastDist = 0;
    let lastCenter = null;
    let isPanningWithTouch = false;

    function applyTransform() {
        mockupArea.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }

    previewWrap.addEventListener('wheel', e => {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
            const rect = mockupArea.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomFactor = 1.01;
            const direction = e.deltaY < 0 ? 1 : -1;
            const newScale = direction > 0 ? scale * zoomFactor : scale / zoomFactor;
            const oldScale = scale;
            scale = Math.max(0.1, Math.min(4, newScale));

            panX -= (mouseX - panX) * (scale / oldScale - 1);
            panY -= (mouseY - panY) * (scale / oldScale - 1);
        } else {
            const panSpeed = 1;
            panX -= e.deltaX * panSpeed;
            panY -= e.deltaY * panSpeed;
        }
        applyTransform();
    }, { passive: false });

    window.addEventListener('keydown', e => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (e.key === ' ' && !isSpaceDown) {
            e.preventDefault();
            isSpaceDown = true;
            previewWrap.style.cursor = 'grab';
        }
        if (e.key === '0') {
            e.preventDefault();
            scale = 1;
            panX = 0;
            panY = 0;
            applyTransform();
        }
    });

    window.addEventListener('keyup', e => {
        if (e.key === ' ') {
            isSpaceDown = false;
            previewWrap.style.cursor = 'default';
        }
    });

    previewWrap.addEventListener('mousedown', e => {
        if (isSpaceDown) {
            isPanningWithSpace = true;
            panStart.x = e.clientX - panX;
            panStart.y = e.clientY - panY;
            previewWrap.style.cursor = 'grabbing';
        }
    });

    previewWrap.addEventListener('mousemove', e => {
        if (isPanningWithSpace) {
            panX = e.clientX - panStart.x;
            panY = e.clientY - panStart.y;
            applyTransform();
        }
    });

    window.addEventListener('mouseup', () => {
        if (isPanningWithSpace) {
            isPanningWithSpace = false;
            previewWrap.style.cursor = isSpaceDown ? 'grab' : 'default';
        }
    });


previewWrap.addEventListener('touchstart', e => {
        // Don't interfere with toolbar
        if (e.target.closest('.toolbar')) {
            return;
        }

        e.preventDefault();

        if (e.touches.length === 1) {
            const stage = Konva.stages[0];
            const touch = e.touches[0];
            
            const stageBox = stage.container().getBoundingClientRect();
            const konvaX = (touch.clientX - stageBox.left) / scale;
            const konvaY = (touch.clientY - stageBox.top) / scale;
            

            const shape = stage.getIntersection({ x: konvaX, y: konvaY });
            
            if (shape) {
                const isFrame = shape.findAncestor('.mockup-group');
                const isTransformer = shape.findAncestor('Transformer');

                if (isFrame || isTransformer) {
                    isPanningWithTouch = false;
                    return;
                }
            }


            isPanningWithTouch = true;
            panStart.x = e.touches[0].clientX - panX;
            panStart.y = e.touches[0].clientY - panY;
            
        } else if (e.touches.length === 2) {

            isPanningWithTouch = false;
            lastDist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            lastCenter = {
                x: (e.touches[0].pageX + e.touches[1].pageX) / 2,
                y: (e.touches[0].pageY + e.touches[1].pageY) / 2
            };
        }
    }, { passive: false });

previewWrap.addEventListener('touchmove', e => {
    if (isPanningWithTouch && e.touches.length === 1) {
        // One-finger pan move
        e.preventDefault();
        panX = e.touches[0].clientX - panStart.x;
        panY = e.touches[0].clientY - panStart.y;
        applyTransform();

    } else if (e.touches.length === 2) {
        // Two-finger zoom/pan move
        e.preventDefault();
        isPanningWithTouch = false;

        const newDist = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
        const newCenter = {
            x: (e.touches[0].pageX + e.touches[1].pageX) / 2,
            y: (e.touches[0].pageY + e.touches[1].pageY) / 2
        };

        // Calculate zoom
        const scaleFactor = newDist / lastDist;
        const oldScale = scale;
        scale = Math.max(0.1, Math.min(4, scale * scaleFactor));

        // Get zoom origin
        const rect = mockupArea.getBoundingClientRect();
        const mouseX = lastCenter.x - rect.left;
        const mouseY = lastCenter.y - rect.top;

        // Apply zoom
        panX -= (mouseX - panX) * (scale / oldScale - 1);
        panY -= (mouseY - panY) * (scale / oldScale - 1);

        // Calculate pan
        panX += newCenter.x - lastCenter.x;
        panY += newCenter.y - lastCenter.y;

        applyTransform();

        // Update for next move
        lastDist = newDist;
        lastCenter = newCenter;
    }
}, { passive: false });

previewWrap.addEventListener('touchend', e => {
    isPanningWithTouch = false;

    if (e.touches.length < 2) {
        lastDist = 0;
        lastCenter = null;
    }
});


applyTransform();
}



// ==========================================================================
// IMAGE PLACING - placeImageInMockup()
// ==========================================================================
export function placeImageInMockup(img, mockup) {
    mockup.find('.upload-placeholder').forEach(node => node.destroy());
    mockup.find('.screenshot-container').forEach(node => node.destroy());

    const frameId = mockup.getAttr('frameId');
    const frameData = frames.find(f => f.id === frameId);
    if (!frameData || !frameData.screen) return;

    const frameNode = mockup.getChildren(node => node.getClassName() === 'Image')[0];
    const frameImage = frameNode.image();
    if (!frameImage) return;
    const frameScale = frameNode.width() / frameImage.width;

    const screenContainer = {
        x: frameData.screen.x * frameScale, y: frameData.screen.y * frameScale,
        width: frameData.screen.width * frameScale, height: frameData.screen.height * frameScale,
    };

    const clipGroup = new Konva.Group({
        x: screenContainer.x, y: screenContainer.y, name: 'screenshot-container',
        clipFunc: function(ctx) {
            const scaledRadius = frameData.screen.cornerRadius * frameScale;
            ctx.beginPath();
            ctx.roundRect(0, 0, screenContainer.width, screenContainer.height, scaledRadius);
            if (frameData.screen.island) {
                const island = frameData.screen.island;
                const islandX = (island.x - frameData.screen.x) * frameScale;
                const islandY = (island.y - frameData.screen.y) * frameScale;
                const islandW = island.width * frameScale;
                const islandH = island.height * frameScale;
                const islandRadius = island.cornerRadius * frameScale;
                ctx.roundRect(islandX, islandY, islandW, islandH, islandRadius);
            }
            ctx.closePath();
        }
    });

    const screenAspectRatio = screenContainer.width / screenContainer.height;
    const imgAspectRatio = img.width / img.height;
    let photoSize;
    if (imgAspectRatio > screenAspectRatio) {
        photoSize = { height: screenContainer.height, width: screenContainer.height * imgAspectRatio };
    } else {
        photoSize = { width: screenContainer.width, height: screenContainer.width / imgAspectRatio };
    }

    const photoPos = {
        x: (screenContainer.width - photoSize.width) / 2,
        y: (screenContainer.height - photoSize.height) / 2,
    };

    const photo = new Konva.Image({
        image: img, x: photoPos.x, y: photoPos.y,
        width: photoSize.width, height: photoSize.height, name: 'screenshot',
        imageSmoothingEnabled: true 
    });

    clipGroup.add(photo);
    mockup.add(clipGroup);
    clipGroup.moveToBottom();
    mockup.getLayer()?.batchDraw();
}

// ==========================================================================
// FRAME SWAPPING - handleFrameSwap()
// ==========================================================================
async function handleFrameSwap() {
    const oldMockup = AppState.currentSelectedMockup;
    if (!oldMockup) return;

    
    const oldTransform = {
        x: oldMockup.x(),
        y: oldMockup.y(),
        scaleX: oldMockup.scaleX(),
        scaleY: oldMockup.scaleY(),
        rotation: oldMockup.rotation(),
    };

    let imageToReapply = null;
    const screenshotContainer = oldMockup.findOne('.screenshot-container');
    if (screenshotContainer) {
        const screenshotNode = screenshotContainer.findOne('.screenshot');
        if (screenshotNode) {
            imageToReapply = screenshotNode.image(); 
        }
    }

    const layer = oldMockup.getLayer();

    oldMockup.destroy();
    tr.nodes([]);

    await addMockup();
    const newMockup = lastAddedMockup;

    newMockup.x(oldTransform.x);
    newMockup.y(oldTransform.y);
    newMockup.scaleX(oldTransform.scaleX);
    newMockup.scaleY(oldTransform.scaleY);
    newMockup.rotation(oldTransform.rotation);

    if (imageToReapply) {
        placeImageInMockup(imageToReapply, newMockup);
    }

    AppState.setCurrentSelectedMockup(newMockup);
    tr.nodes([newMockup]);

    layer.batchDraw();
}

// ==========================================================================
// IMAGE UPLOAD - handleImageUpload()
// ==========================================================================
async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please select a valid image file.');
    if (file.size > 8 * 1024 * 1024) return alert('Image file is too large! Please upload a file under 8MB.');
    try {
        const dataURL = await Helpers.readFileAsDataURL(file);
        const img = await Helpers.loadImage(dataURL);
        AppState.setPhotoImg(img);

        const targetMockup = AppState.currentSelectedMockup || lastAddedMockup;
        if (targetMockup) {
            placeImageInMockup(img, targetMockup);
        } else {
            alert("Please add or select a frame to place the image in.");
        }
    } catch (error) {
        console.error("Error processing image:", error);
        alert("Sorry, there was an error processing your image.");
    } finally {
        UI.fileInput.value = "";
    }
}

// ==========================================================================
// BACKGROUND - renderBackground()
// ==========================================================================
function renderBackground() {
    const ctx = UI.canvasEl.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { innerWidth: w, innerHeight: h } = window;
    UI.canvasEl.width = Math.floor(w * dpr);
    UI.canvasEl.height = Math.floor(h * dpr);
    UI.canvasEl.style.width = `${w}px`;
    UI.canvasEl.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#f1f2f3';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#000';
    for (let x = -h; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + h, h);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

window.addEventListener('resize', () => requestAnimationFrame(renderBackground));