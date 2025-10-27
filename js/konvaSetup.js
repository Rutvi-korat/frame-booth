// ==========================================================================
// KONVA.JS INITIALIZATION & SETUP
// ==========================================================================

import * as UI from './ui.js';
import { frames, AppState } from './state.js';
import { loadImage } from './helpers.js';

// variables for the Konva stage and its components //
let stage;
let layer;
export let tr;
let backgroundRect;
const mockups = [];
export let lastAddedMockup = null;
let initialStageHeight;

/**
 * Creates and adds an "Upload an Image" placeholder to a mockup group.
 * The placeholder is clickable and opens the file input dialog.
 * @param {Konva.Group} group The parent mockup group.
 * @param {object} frameData The data object for the frame.
 * @param {number} scale The calculated scale of the frame.
 */

// ==========================================================================
// PLACEHOLDER - createAndAddPlaceholder()
// ==========================================================================
function createAndAddPlaceholder(group, frameData, scale) {
    const screenRect = {
        x: frameData.screen.x * scale,
        y: frameData.screen.y * scale,
        width: frameData.screen.width * scale,
        height: frameData.screen.height * scale
    };

    const placeholderGroup = new Konva.Group({
        name: 'upload-placeholder',
        x: screenRect.x,
        y: screenRect.y,
        // === ADD THIS CLIP FUNCTION ===
        clipFunc: function(ctx) {
            const scaledRadius = frameData.screen.cornerRadius * scale;
            ctx.beginPath();
            ctx.roundRect(0, 0, screenRect.width, screenRect.height, scaledRadius);
            
            // Add island cutout
            if (frameData.screen.island) {
                const island = frameData.screen.island;
                // Calculate island position relative to the placeholder group
                const islandX = (island.x - frameData.screen.x) * scale;
                const islandY = (island.y - frameData.screen.y) * scale;
                const islandW = island.width * scale;
                const islandH = island.height * scale;
                const islandRadius = island.cornerRadius * scale;
                ctx.roundRect(islandX, islandY, islandW, islandH, islandRadius);
            }
            ctx.closePath();
        },
    });

    const clickableArea = new Konva.Rect({
        width: screenRect.width,
        height: screenRect.height,
    });

    const uploadIconPath = 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12';
    const icon = new Konva.Path({
        data: uploadIconPath,
        stroke: '#d6d6d6ff',
        strokeWidth: 1.5,
        scale: { x: 2.5, y: 2.5 },
    });

    const placeholderText = new Konva.Text({
        text: 'Upload an Image',
        fontSize: 18,
        fontFamily: 'Inter, sans-serif',
        fill: '#d6d6d6ff',
        fontStyle: '500',
    });

    icon.position({ x: screenRect.width / 2, y: screenRect.height / 2 - 10 });
    placeholderText.position({ x: screenRect.width / 2, y: screenRect.height / 2 + 40 });

    icon.offset({ x: 12, y: 12 });
    placeholderText.offset({ x: placeholderText.width() / 2, y: placeholderText.height() / 2 });

    placeholderGroup.add(clickableArea, icon, placeholderText);
    group.add(placeholderGroup);

    placeholderGroup.on('click tap', (e) => {
        e.cancelBubble = true;
        AppState.setCurrentSelectedMockup(group);
        tr.nodes([group]);
        group.moveToTop();
        tr.moveToTop();
        UI.deleteBtn.disabled = false;
        UI.downloadFrameBtn.disabled = false;
        UI.updateFrameBtn.disabled = false;
        layer.batchDraw();
        UI.fileInput.click();
    });
    }

// ==========================================================================
// DELETE MOCKUP - deleteSelectedMockup()
// ==========================================================================
function deleteSelectedMockup() {
    const selected = tr.nodes()[0];
    if (!selected) return;

    const screenshotContainer = selected.findOne('.screenshot-container');

    if (screenshotContainer) {
        screenshotContainer.destroy();

        const frameId = selected.getAttr('frameId');
        const frameData = frames.find(f => f.id === frameId);
        const frameNode = selected.getChildren(node => node.getClassName() === 'Image')[0];
        const frameImage = frameNode.image();
        const scale = frameNode.width() / frameImage.width;

        createAndAddPlaceholder(selected, frameData, scale);
        frameNode.moveToTop();
        layer.batchDraw();
    } else {
        const idx = mockups.indexOf(selected);
        if (idx !== -1) mockups.splice(idx, 1);

        selected.destroy();
        tr.nodes([]);
        AppState.setCurrentSelectedMockup(null);

        UI.deleteBtn.disabled = true;
        UI.downloadFrameBtn.disabled = true;
        UI.updateFrameBtn.disabled = true;
        layer.batchDraw();
    }
    }

// ==========================================================================
// ADD MOCKUP - addMockup()
// ==========================================================================
export async function addMockup() {
    const frameData = frames.find(f => f.id === UI.frameSelect.value);
    if (!frameData) return;

    /* Calculate a dynamic size for the new frame to fit nicely on the canvas */
    const maxCanvasHeight = initialStageHeight * 0.8;
    const maxOriginalHeight = Math.max(...frames.map(f => f.originalHeight || 0));
    const desiredHeight = (frameData.originalHeight / maxOriginalHeight) * maxCanvasHeight;

    const frameImg = await loadImage(frameData.src);
    const scale = desiredHeight / frameImg.height;
    const frameWidth = frameImg.width * scale;
    const frameHeight = desiredHeight;

    const group = new Konva.Group({
        draggable: true,
        name: 'mockup-group'
    });
    group.setAttr('frameId', frameData.id);

    const frameNode = new Konva.Image({
        image: frameImg,
        width: frameWidth,
        height: frameHeight,
        listening: false
    });
    createAndAddPlaceholder(group, frameData, scale);
    group.add(frameNode);



    /* Center the new mockup on the stage */
    group.position({
        x: stage.width() / 2 - frameWidth / 2,
        y: stage.height() / 2 - frameHeight / 2,
    });

    const selectGroup = () => {
        AppState.setCurrentSelectedMockup(group);
        tr.nodes([group]);
        group.moveToTop();
        tr.moveToTop();
        UI.deleteBtn.disabled = false;
        UI.downloadFrameBtn.disabled = false;
        UI.updateFrameBtn.disabled = false;
        layer.batchDraw();
    };

    group.on('click', (e) => {
        e.cancelBubble = true;
        selectGroup();
    });

    layer.add(group);
    mockups.push(group);
    lastAddedMockup = group;

    selectGroup();
    layer.batchDraw();
    }

// ==========================================================================
// KONVA INITIALIZATION - initKonva()
// ==========================================================================
export function initKonva() {
    stage = new Konva.Stage({
        container: 'mockupArea',
        width: UI.mockupArea.offsetWidth,
        height: UI.mockupArea.offsetHeight
    });
    initialStageHeight = stage.height();

    layer = new Konva.Layer();
    stage.add(layer);

    backgroundRect = new Konva.Rect({
        x: 0,
        y: 0,
        width: stage.width(),
        height: stage.height(),
        fill: UI.bgColor.value || "#fff",
        listening: false,
    });
    layer.add(backgroundRect);

    tr = new Konva.Transformer({
        rotateEnabled: true,
        resizeEnabled: true,
        enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        anchorStroke: '#111827',
        anchorFill: '#fff',
        anchorSize: 10,
        borderStroke: '#111827',
        borderDash: [4, 4],
    });
    layer.add(tr);

    /* Stage-level event listeners */
    stage.on('click', (e) => {
        if (e.target === stage) {
        AppState.setCurrentSelectedMockup(null);
        tr.nodes([]);
        UI.deleteBtn.disabled = true;
        UI.downloadFrameBtn.disabled = true;
        UI.updateFrameBtn.disabled = true;
        layer.batchDraw();
        }
    });

    /* UI event listeners tied to Konva actions */
    UI.bgColor.addEventListener('input', () => {
        backgroundRect.fill(UI.bgColor.value);
        layer.batchDraw();
    });

    UI.deleteBtn.addEventListener('click', deleteSelectedMockup);

    window.addEventListener('keydown', (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (['Delete', 'Backspace'].includes(e.key)) {
        deleteSelectedMockup();
        }
    });
}

// ==========================================================================
// KONVA RESIZE - resizeKonvaStage()
// ==========================================================================
export function resizeKonvaStage() {
    if (stage) {
        stage.size({
        width: UI.mockupArea.offsetWidth,
        height: UI.mockupArea.offsetHeight
        });
        backgroundRect.size(stage.size());
        layer.batchDraw();
    }
}