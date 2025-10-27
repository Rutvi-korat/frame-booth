// ==========================================================================
// EXPORT FUNCTIONALITY
// ==========================================================================
import { downloadBtn, downloadFrameBtn } from './ui.js';

// ==========================================================================
//  HELPER FUNCTIONS
// ==========================================================================
/**
 * A utility to trigger a browser download for a given data URI.
 * @param {string} uri The data URI (e.g., from canvas.toDataURL()) to download.
 * @param {string} name The desired filename for the downloaded file.
 */

// ==========================================================================
// DOWNLOAD URI - downloadURI()
// ==========================================================================
function downloadURI(uri, name) {
    const link = document.createElement('a');
    link.download = name;
    link.href = uri;
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link); // Clean up the link element
}

// ==========================================================================
//  INITIALIZATION
// ==========================================================================

// ==========================================================================
// EXPORT BUTTON - initExport()
// ==========================================================================
export function initExport() {

    // --- EXPORT ENTIRE SCENE ---
    downloadBtn.addEventListener('click', () => {
        const stage = Konva.stages[0];
        const tr = stage.findOne('Transformer');
        const oldNodes = tr.nodes(); 

        tr.nodes([]);
        stage.findOne('Layer').batchDraw();

        stage.toDataURL({
            pixelRatio: 4, // High resolution export
            mimeType: 'image/png',
            callback(dataURL) {
                downloadURI(dataURL, 'scene.png'); // This opens the system "Save As..." dialog
                tr.nodes(oldNodes);
                stage.findOne('Layer').batchDraw();
                tr.nodes(oldNodes);
                stage.findOne('Layer').batchDraw();
            }
        });
    });

    // --- EXPORT SELECTED FRAME ONLY ---
    downloadFrameBtn.addEventListener('click', () => {
        const selectedNode = Konva.stages[0].findOne('Transformer').nodes()[0];
        if (!selectedNode) return;

        // --- Off-Screen Rendering for a Clean, High-Res Export ---
        const EXPORT_SIZE = 1500;

        // Create a temporary, invisible div to host the off-screen stage
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.top = '-9999px';
        document.body.appendChild(tempContainer);

        // Create a temporary Konva stage
        const tempStage = new Konva.Stage({
            container: tempContainer,
            width: EXPORT_SIZE,
            height: EXPORT_SIZE,
        });
        const tempLayer = new Konva.Layer();
        tempStage.add(tempLayer);

        // Clone the selected node to avoid altering the original
        const clone = selectedNode.clone({ draggable: false });

        // Reset all transformations (position, rotation, scale) on the clone
        clone.position({ x: 0, y: 0 });
        clone.rotation(0);
        clone.scale({ x: 1, y: 1 });

        // Calculate scale to fit the clone perfectly into the export size
        const originalSize = clone.getClientRect({ skipTransform: true });
        const scale = EXPORT_SIZE / Math.max(originalSize.width, originalSize.height);
        const newWidth = originalSize.width * scale;
        const newHeight = originalSize.height * scale;

        // Resize the temporary stage and scale the clone to fit
        tempStage.size({ width: newWidth, height: newHeight });
        clone.scale({ x: scale, y: scale });
        tempLayer.add(clone);
        tempLayer.draw();

        // Generate the data URL and trigger the download
        const dataURL = tempStage.toDataURL({ pixelRatio: 1, mimeType: 'image/png' });
        downloadURI(dataURL, 'frame.png');

        // Clean up temporary DOM elements to prevent memory leaks
        tempStage.destroy();
        tempContainer.remove();
    });
}