/**
 * Attachment Viewer for Grist
 * 
 * Derived from original work: viewer (https://github.com/gristlabs/grist-widget/viewer)
 * Copyright 2024 gristlabs
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * Modifications:
 * - Converted URL-based media viewer to Grist attachment viewer
 */

class AttachmentViewer {
    constructor() {
        this.viewerElement = document.getElementById('viewer');
        this.nameElement = document.getElementById('name');
        this.idElement = document.getElementById('attachment-id');
        this.errorElement = document.getElementById('error');
        this.properUrlEl = document.getElementById('proper-url');
        this.navButtons = document.getElementById('navigation-buttons');
        this.token = null;
        this.baseUrl = null;
        this.currentAttachment = null;
        this.attachments = [];
        this.currentIndex = 0;

        this.initGrist();
        this.setupEventListeners();
    }

    initGrist() {
        grist.ready({ requiredAccess: 'full' });

        grist.onRecord(record => {
            this.handleRecordUpdate(record);
        });

        grist.onNewRecord(() => {
            this.nameElement.textContent = "";
            this.idElement.textContent = "";
            this.properUrlEl.textContent = "";
            this.viewerElement.style.display = 'none';
            this.navButtons.style.display = 'none';
            this.attachments = [];
            this.currentAttachmentId = null;
            this.currentAttachmentIndex = 0;
        });

        grist.docApi.getAccessToken({ readOnly: true }).then(response => {
            this.token = response.token;
            this.baseUrl = response.baseUrl.replace("0.0.0.0", "localhost");
            this.updateViewer();
        }).catch(_ => {
            this.showError("Failed to get access token");
        });
    }

    setupEventListeners() {
        document.getElementById('btn-previous').addEventListener('click', () => this.previous());
        document.getElementById('btn-next').addEventListener('click', () => this.next());

        // Touch swipe support
        this.viewerElement.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
        });

        this.viewerElement.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const deltaX = touchEndX - this.touchStartX;

            if (Math.abs(deltaX) > 100) { // Minimum swipe distance
                if (deltaX > 0) {
                    this.previous();
                } else {
                    this.next();
                }
            }
        });
    }

    handleRecordUpdate(record) {
        this.nameElement.textContent = record.Name || "(No name)";

        const imageField = record.Image || [];
        this.attachments = Array.isArray(imageField) ? imageField : [imageField];

        // Extract ID whether it's a direct value or object property
        this.currentAttachmentId = this.attachments?.[0] || null; // Safely get attachment ID or null
        this.currentAttachmentIndex = 0;

        this.idElement.textContent = this.currentAttachmentId || "No image";
        this.updateViewer();
    }

    updateViewer() {
        if (!this.currentAttachmentId || !this.token || !this.baseUrl) {
            this.viewerElement.style.display = 'none';
            this.navButtons.style.display = 'none';
            return;
        }

        const url = `${this.baseUrl}/attachments/${this.currentAttachmentId}/download?auth=${this.token}`;
        this.viewerElement.src = url;
        this.viewerElement.style.display = 'block';
        this.properUrlEl.textContent = url;

        // Show navigation if multiple attachments
        this.navButtons.style.display = this.attachments.length > 1 ? 'flex' : 'none';
    }

    previous() {
        if (this.attachments.length < 2) return;
        // Jump to the end if at the start
        this.currentAttachmentIndex = (this.attachments.length + this.currentAttachmentIndex - 1) % this.attachments.length;
        this.currentAttachmentId = this.attachments[this.currentAttachmentIndex];
        this.idElement.textContent = this.currentAttachmentId;
        this.updateViewer();
    }

    next() {
        if (this.attachments.length < 2) return;

        this.currentAttachmentIndex = (this.currentAttachmentIndex + 1) % this.attachments.length;
        this.currentAttachmentId = this.attachments[this.currentAttachmentIndex];
        this.idElement.textContent = this.currentAttachmentId;
        this.updateViewer();
    }

    showError(message) {
        if (!message) {
            this.errorElement.style.display = 'none';
            return;
        }

        this.errorElement.textContent = message;
        this.errorElement.style.display = 'block';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AttachmentViewer();

    // Hide navigation buttons on touch devices (they'll use swipe instead)
    if ('ontouchstart' in window) {
        document.getElementById('navigation-buttons').style.display = 'none';
    }
});
