// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const codeInput = document.getElementById('codeInput');
const clearCodeBtn = document.getElementById('clearCodeBtn');
const languageSelect = document.getElementById('languageSelect');
const uploadBtn = document.getElementById('uploadBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');
const filesList = document.getElementById('filesList');
const filesListItems = document.getElementById('filesListItems');
const resultsSection = document.getElementById('resultsSection');
const resultsDetails = document.getElementById('resultsDetails');

// State
let selectedFiles = [];
let pastedCode = '';

// File size formatter
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Get file extension
const getFileExtension = (filename) => {
    return filename.split('.').pop().toLowerCase();
};

// Get file icon based on extension
const getFileIcon = (extension) => {
    const iconMap = {
        'js': 'fab fa-js',
        'jsx': 'fab fa-react',
        'ts': 'fab fa-js',
        'tsx': 'fab fa-react',
        'py': 'fab fa-python',
        'java': 'fab fa-java',
        'cpp': 'fas fa-code',
        'c': 'fas fa-code',
        'php': 'fab fa-php',
        'rb': 'fas fa-gem',
        'go': 'fas fa-code',
        'rs': 'fas fa-code',
        'html': 'fab fa-html5',
        'css': 'fab fa-css3-alt',
        'json': 'fas fa-brackets-curly',
        'xml': 'fas fa-code',
        'txt': 'fas fa-file-alt'
    };
    return iconMap[extension] || 'fas fa-file-code';
};

// Show status message
const showStatus = (message, type = 'info') => {
    statusMessage.hidden = false;
    statusMessage.className = `status-message ${type}`;
    statusText.textContent = message;
    
    const iconMap = {
        'info': 'fa-info-circle',
        'success': 'fa-check-circle',
        'warning': 'fa-exclamation-triangle',
        'error': 'fa-times-circle'
    };
    
    statusMessage.querySelector('i').className = `fas ${iconMap[type]}`;
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusMessage.hidden = true;
        }, 5000);
    }
};

// Hide status message
const hideStatus = () => {
    statusMessage.hidden = true;
};

// Update upload button state
const updateUploadButton = () => {
    const hasFiles = selectedFiles.length > 0;
    const hasCode = pastedCode.trim().length > 0;
    uploadBtn.disabled = !(hasFiles || hasCode);
};

// Add file to list
const addFile = (file) => {
    // Check if file already exists
    if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        showStatus('File already added', 'warning');
        return;
    }

    selectedFiles.push(file);
    renderFilesList();
    updateUploadButton();
    showStatus(`Added: ${file.name}`, 'success');
};

// Remove file from list
const removeFile = (index) => {
    selectedFiles.splice(index, 1);
    renderFilesList();
    updateUploadButton();
    if (selectedFiles.length === 0 && !pastedCode.trim()) {
        filesList.hidden = true;
    }
};

// Render files list
const renderFilesList = () => {
    if (selectedFiles.length === 0) {
        filesList.hidden = true;
        return;
    }

    filesList.hidden = false;
    filesListItems.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        
        const extension = getFileExtension(file.name);
        const icon = getFileIcon(extension);
        
        li.innerHTML = `
            <div class="file-info">
                <i class="${icon}"></i>
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                </div>
            </div>
            <button type="button" class="file-remove" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        filesListItems.appendChild(li);
    });

    // Add event listeners to remove buttons
    filesListItems.querySelectorAll('.file-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            removeFile(index);
        });
    });
};

// Handle file selection
const handleFiles = (files) => {
    if (files.length === 0) return;

    Array.from(files).forEach(file => {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showStatus(`File ${file.name} is too large (max 10MB)`, 'error');
            return;
        }
        addFile(file);
    });
};

// Drag and drop handlers
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    handleFiles(files);
});

uploadArea.addEventListener('click', () => {
    fileInput.click();
});

browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    // Reset input to allow selecting same file again
    fileInput.value = '';
});

// Code input handler
codeInput.addEventListener('input', (e) => {
    pastedCode = e.target.value;
    updateUploadButton();
});

// Clear code button
clearCodeBtn.addEventListener('click', () => {
    codeInput.value = '';
    pastedCode = '';
    updateUploadButton();
    showStatus('Code cleared', 'info');
});

// Upload/Scan button
uploadBtn.addEventListener('click', async () => {
    if (uploadBtn.disabled) return;

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
    hideStatus();
    resultsSection.hidden = true;

    try {
        // Simulate scanning process
        await simulateScan();
        
        // Show results
        displayResults();
        
        showStatus('Scan completed successfully!', 'success');
        resetBtn.hidden = false;
    } catch (error) {
        showStatus('An error occurred during scanning', 'error');
        console.error('Scan error:', error);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Scan for Threats';
    }
});

// Simulate scanning (replace with actual API call)
const simulateScan = () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 2000);
    });
};

// Display scan results
const displayResults = () => {
    resultsSection.hidden = false;
    
    let threatsFound = 0;
    let filesSafe = 0;
    const totalFiles = selectedFiles.length + (pastedCode.trim() ? 1 : 0);

    // Update summary stats
    document.getElementById('filesScanned').textContent = totalFiles;
    
    resultsDetails.innerHTML = '';

    // Scan files
    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const result = analyzeCode(content, file.name);
            
            if (result.hasThreat) {
                threatsFound++;
            } else {
                filesSafe++;
            }

            addResultItem(file.name, result);
            updateResultsSummary();
        };
        reader.readAsText(file);
    });

    // Scan pasted code
    if (pastedCode.trim()) {
        const result = analyzeCode(pastedCode, `pasted-code.${languageSelect.value || 'txt'}`);
        
        if (result.hasThreat) {
            threatsFound++;
        } else {
            filesSafe++;
        }

        addResultItem('Pasted Code', result);
        updateResultsSummary();
    }

    document.getElementById('threatsFound').textContent = threatsFound;
    document.getElementById('filesSafe').textContent = filesSafe;
};

// Analyze code for threats (simplified detection)
const analyzeCode = (content, filename) => {
    const threats = [];
    const suspiciousPatterns = [
        { pattern: /eval\s*\(/gi, name: 'eval() usage', severity: 'high' },
        { pattern: /exec\s*\(/gi, name: 'exec() usage', severity: 'high' },
        { pattern: /system\s*\(/gi, name: 'system() call', severity: 'high' },
        { pattern: /shell_exec\s*\(/gi, name: 'shell_exec() usage', severity: 'high' },
        { pattern: /base64_decode\s*\(/gi, name: 'Base64 decode', severity: 'medium' },
        { pattern: /gzinflate\s*\(/gi, name: 'Gzip inflate', severity: 'medium' },
        { pattern: /str_rot13\s*\(/gi, name: 'ROT13 encoding', severity: 'medium' },
        { pattern: /file_get_contents\s*\([^)]*http/gi, name: 'Remote file inclusion', severity: 'high' },
        { pattern: /curl_exec\s*\(/gi, name: 'cURL execution', severity: 'medium' },
        { pattern: /passthru\s*\(/gi, name: 'passthru() usage', severity: 'high' },
        { pattern: /proc_open\s*\(/gi, name: 'proc_open() usage', severity: 'high' },
        { pattern: /popen\s*\(/gi, name: 'popen() usage', severity: 'high' },
        { pattern: /<script[^>]*>.*?document\.cookie/gi, name: 'Cookie theft attempt', severity: 'high' },
        { pattern: /<iframe[^>]*src/gi, name: 'Iframe injection', severity: 'medium' },
        { pattern: /\.innerHTML\s*=/gi, name: 'innerHTML assignment', severity: 'low' },
    ];

    suspiciousPatterns.forEach(({ pattern, name, severity }) => {
        const matches = content.match(pattern);
        if (matches) {
            threats.push({
                name,
                severity,
                count: matches.length
            });
        }
    });

    return {
        hasThreat: threats.length > 0,
        threats,
        filename
    };
};

// Add result item to results
const addResultItem = (filename, result) => {
    const resultItem = document.createElement('div');
    resultItem.className = `result-item ${result.hasThreat ? 'threat' : 'safe'}`;
    
    let threatsHTML = '';
    if (result.hasThreat) {
        threatsHTML = '<ul style="margin-top: 0.5rem; padding-left: 1.5rem;">';
        result.threats.forEach(threat => {
            const severityColor = threat.severity === 'high' ? '#e74c3c' : 
                                 threat.severity === 'medium' ? '#f39c12' : '#3498db';
            threatsHTML += `<li style="margin: 0.5rem 0; color: ${severityColor};">
                <strong>${threat.name}</strong> (${threat.severity} severity) - Found ${threat.count} time(s)
            </li>`;
        });
        threatsHTML += '</ul>';
    }

    resultItem.innerHTML = `
        <div class="result-header">
            <div class="result-file-name">
                <i class="fas fa-file-code"></i>
                ${filename}
            </div>
            <span class="result-status ${result.hasThreat ? 'threat' : 'safe'}">
                ${result.hasThreat ? 'Threat Detected' : 'Safe'}
            </span>
        </div>
        <div class="result-details">
            ${result.hasThreat 
                ? `⚠️ This file contains potentially malicious code patterns. Review the threats below:${threatsHTML}`
                : '✅ No malicious patterns detected. This file appears to be safe.'}
        </div>
    `;
    
    resultsDetails.appendChild(resultItem);
};

// Update results summary
const updateResultsSummary = () => {
    const threatItems = resultsDetails.querySelectorAll('.result-item.threat').length;
    const safeItems = resultsDetails.querySelectorAll('.result-item.safe').length;
    
    document.getElementById('threatsFound').textContent = threatItems;
    document.getElementById('filesSafe').textContent = safeItems;
};

// Reset button
resetBtn.addEventListener('click', () => {
    selectedFiles = [];
    pastedCode = '';
    codeInput.value = '';
    fileInput.value = '';
    filesList.hidden = true;
    resultsSection.hidden = true;
    resetBtn.hidden = true;
    hideStatus();
    updateUploadButton();
    showStatus('All cleared. Ready for new upload.', 'info');
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateUploadButton();
    showStatus('Ready to scan your code. Upload files or paste code.', 'info');
});

