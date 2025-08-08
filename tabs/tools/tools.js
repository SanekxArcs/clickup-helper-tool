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
            // Screen size inputs
            screenWidth: document.getElementById('screenWidth'),
            screenHeight: document.getElementById('screenHeight'),
            
            // Base font size
            baseFontSize: document.getElementById('baseFontSize'),
            
            // Input value and unit
            inputValue: document.getElementById('inputValue'),
            // Remove inputUnit since we're using buttons now
            
            // Unit buttons
            unitButtons: document.querySelectorAll('.unit-btn'),
            
            // Results
            conversionResults: document.getElementById('conversionResults'),
            resultPx: document.getElementById('resultPx'),
            resultRem: document.getElementById('resultRem'),
            resultVw: document.getElementById('resultVw'),
            resultVh: document.getElementById('resultVh'),
            conversionFormula: document.getElementById('conversionFormula'),
            
            // Preset buttons
            presetButtons: document.querySelectorAll('.screen-preset-btn')
        };
        
        // Initialize selected unit
        this.selectedUnit = 'px';
    }

    setupEventListeners() {
        // Input value change
        if (this.elements.inputValue) {
            this.elements.inputValue.addEventListener('input', () => this.calculateConversions());
        }
        
        // Unit button clicks
        this.elements.unitButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                this.elements.unitButtons.forEach(btn => {
                    btn.classList.remove('bg-blue-500', 'text-white');
                    btn.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
                });
                
                // Add active class to clicked button
                button.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
                button.classList.add('bg-blue-500', 'text-white');
                
                // Update selected unit
                this.selectedUnit = button.dataset.unit;
                
                // Recalculate conversions
                this.calculateConversions();
            });
        });
        
        // Screen size changes
        if (this.elements.screenWidth) {
            this.elements.screenWidth.addEventListener('input', () => this.calculateConversions());
        }
        
        if (this.elements.screenHeight) {
            this.elements.screenHeight.addEventListener('input', () => this.calculateConversions());
        }
        
        // Base font size change
        if (this.elements.baseFontSize) {
            this.elements.baseFontSize.addEventListener('input', () => this.calculateConversions());
        }
        
        // Preset buttons
        this.elements.presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const width = button.dataset.width;
                const height = button.dataset.height;
                
                if (this.elements.screenWidth) this.elements.screenWidth.value = width;
                if (this.elements.screenHeight) this.elements.screenHeight.value = height;
                
                this.calculateConversions();
            });
        });
    }

    calculateConversions() {
        const inputValue = parseFloat(this.elements.inputValue?.value);
        const inputUnit = this.selectedUnit; // Use selectedUnit instead of dropdown value
        const screenWidth = parseFloat(this.elements.screenWidth?.value) || 1440;
        const screenHeight = parseFloat(this.elements.screenHeight?.value) || 900;
        const baseFontSize = parseFloat(this.elements.baseFontSize?.value) || 16;
        
        if (!inputValue || isNaN(inputValue) || inputValue <= 0) {
            this.hideResults();
            return;
        }
        
        let pxValue, remValue, vwValue, vhValue;
        let formula = '';
        
        // Convert input to pixels first
        switch (inputUnit) {
            case 'px':
                pxValue = inputValue;
                formula = `${inputValue}px`;
                break;
            case 'rem':
                pxValue = inputValue * baseFontSize;
                formula = `${inputValue}rem × ${baseFontSize}px = ${pxValue}px`;
                break;
            case 'vw':
                pxValue = (inputValue * screenWidth) / 100;
                formula = `${inputValue}vw × ${screenWidth}px ÷ 100 = ${pxValue}px`;
                break;
            case 'vh':
                pxValue = (inputValue * screenHeight) / 100;
                formula = `${inputValue}vh × ${screenHeight}px ÷ 100 = ${pxValue}px`;
                break;
        }
        
        // Calculate all other units from pixels
        remValue = (pxValue / baseFontSize).toFixed(4);
        vwValue = ((pxValue / screenWidth) * 100).toFixed(4);
        vhValue = ((pxValue / screenHeight) * 100).toFixed(4);
        
        // Update results
        this.showResults({
            px: pxValue.toFixed(2),
            rem: remValue,
            vw: vwValue,
            vh: vhValue,
            formula: formula
        });
    }

    showResults(results) {
        if (this.elements.resultPx) this.elements.resultPx.textContent = results.px;
        if (this.elements.resultRem) this.elements.resultRem.textContent = results.rem;
        if (this.elements.resultVw) this.elements.resultVw.textContent = `${results.vw}%`;
        if (this.elements.resultVh) this.elements.resultVh.textContent = `${results.vh}%`;
        
        if (this.elements.conversionFormula) {
            this.elements.conversionFormula.textContent = `Formula: ${results.formula}`;
        }
        
        if (this.elements.conversionResults) {
            this.elements.conversionResults.classList.remove('hidden');
        }
    }

    hideResults() {
        if (this.elements.conversionResults) {
            this.elements.conversionResults.classList.add('hidden');
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
