import { Utils } from '../../shared/utils.js';

export class ToolsTab {
    constructor() {
        this.elements = {};
        this.initialize();
    }

    initialize() {
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.elements = {
            baseFontSize: document.getElementById('baseFontSize'),
            remValue: document.getElementById('remValue'),
            pxValue: document.getElementById('pxValue'),
            conversionResult: document.getElementById('conversionResult')
        };
    }

    setupEventListeners() {
        // Add event listeners for real-time conversion
        if (this.elements.remValue) {
            this.elements.remValue.addEventListener('input', () => this.convertRemToPx());
        }
        
        if (this.elements.pxValue) {
            this.elements.pxValue.addEventListener('input', () => this.convertPxToRem());
        }
        
        if (this.elements.baseFontSize) {
            this.elements.baseFontSize.addEventListener('input', () => this.updateConversions());
        }
    }

    convertRemToPx() {
        const remValue = parseFloat(this.elements.remValue.value);
        const baseFontSize = parseFloat(this.elements.baseFontSize.value) || 16;
        
        if (!isNaN(remValue) && remValue !== '') {
            const pxValue = remValue * baseFontSize;
            this.elements.pxValue.value = pxValue;
            this.showResult(`${remValue} REM = ${pxValue} PX (base: ${baseFontSize}px)`);
        } else if (this.elements.remValue.value === '') {
            this.elements.pxValue.value = '';
            this.hideResult();
        }
    }

    convertPxToRem() {
        const pxValue = parseFloat(this.elements.pxValue.value);
        const baseFontSize = parseFloat(this.elements.baseFontSize.value) || 16;
        
        if (!isNaN(pxValue) && pxValue !== '') {
            const remValue = (pxValue / baseFontSize).toFixed(4);
            this.elements.remValue.value = remValue;
            this.showResult(`${pxValue} PX = ${remValue} REM (base: ${baseFontSize}px)`);
        } else if (this.elements.pxValue.value === '') {
            this.elements.remValue.value = '';
            this.hideResult();
        }
    }

    updateConversions() {
        // Update conversion when base font size changes
        if (this.elements.remValue.value) {
            this.convertRemToPx();
        } else if (this.elements.pxValue.value) {
            this.convertPxToRem();
        }
    }

    showResult(text) {
        if (this.elements.conversionResult) {
            this.elements.conversionResult.textContent = text;
            this.elements.conversionResult.classList.remove('hidden');
        }
    }

    hideResult() {
        if (this.elements.conversionResult) {
            this.elements.conversionResult.classList.add('hidden');
        }
    }

    // Tab lifecycle methods (called by TabManager)
    onActivate() {
        console.log('Tools tab activated');
        // Re-initialize elements in case they weren't available during construction
        this.initializeElements();
        this.setupEventListeners();
    }

    onDeactivate() {
        console.log('Tools tab deactivated');
    }
}
