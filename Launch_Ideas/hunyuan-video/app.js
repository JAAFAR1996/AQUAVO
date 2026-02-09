/**
 * HunyuanVideo I2V - Frontend Application
 * Handles image upload, video generation, and UI interactions
 */

// ===== Configuration =====
const CONFIG = {
    // Update this URL after deploying to Modal
    API_URL: 'https://jaafarhabash9--api.modal.run/generate',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    ASPECT_RATIOS: {
        '9:16': { width: 720, height: 1280 },   // Portrait (Reels/TikTok)
        '1:1': { width: 720, height: 720 },     // Square
        '16:9': { width: 1280, height: 720 },   // Landscape
    },
    FPS: 8,
};

// ===== DOM Elements =====
const elements = {
    uploadArea: document.getElementById('uploadArea'),
    imageInput: document.getElementById('imageInput'),
    uploadPlaceholder: document.getElementById('uploadPlaceholder'),
    imagePreview: document.getElementById('imagePreview'),
    previewImg: document.getElementById('previewImg'),
    removeBtn: document.getElementById('removeBtn'),
    promptInput: document.getElementById('promptInput'),
    aspectRatio: document.getElementById('aspectRatio'),
    duration: document.getElementById('duration'),
    generateBtn: document.getElementById('generateBtn'),
    progressSection: document.getElementById('progressSection'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    resultSection: document.getElementById('resultSection'),
    resultVideo: document.getElementById('resultVideo'),
    downloadBtn: document.getElementById('downloadBtn'),
    newBtn: document.getElementById('newBtn'),
    errorSection: document.getElementById('errorSection'),
    errorText: document.getElementById('errorText'),
    retryBtn: document.getElementById('retryBtn'),
    timerValue: document.getElementById('timerValue'),
    logsContent: document.getElementById('logsContent'),
};

// ===== State =====
let state = {
    imageFile: null,
    imageBase64: null,
    videoBlob: null,
    isGenerating: false,
    timerInterval: null,
    startTime: null,
};

// ===== Event Listeners =====
function initEventListeners() {
    // Upload area click
    elements.uploadArea.addEventListener('click', () => {
        if (!state.imageFile) {
            elements.imageInput.click();
        }
    });

    // File input change
    elements.imageInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);

    // Remove image
    elements.removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearImage();
    });

    // Prompt input
    elements.promptInput.addEventListener('input', updateGenerateButton);

    // Generate button
    elements.generateBtn.addEventListener('click', generateVideo);

    // Download button
    elements.downloadBtn.addEventListener('click', downloadVideo);

    // New video button
    elements.newBtn.addEventListener('click', resetUI);

    // Retry button
    elements.retryBtn.addEventListener('click', generateVideo);
}

// ===== File Handling =====
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file) {
        processFile(file);
    }
}

function processFile(file) {
    // Validate file type
    if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
        showError('نوع الملف غير مدعوم. الرجاء استخدام PNG, JPG, WEBP, أو GIF');
        return;
    }

    // Validate file size
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showError('حجم الملف كبير جداً. الحد الأقصى 10MB');
        return;
    }

    state.imageFile = file;

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (e) => {
        state.imageBase64 = e.target.result.split(',')[1]; // Remove data URL prefix

        // Show preview
        elements.previewImg.src = e.target.result;
        elements.uploadPlaceholder.hidden = true;
        elements.imagePreview.hidden = false;

        updateGenerateButton();
    };
    reader.readAsDataURL(file);
}

function clearImage() {
    state.imageFile = null;
    state.imageBase64 = null;
    elements.imageInput.value = '';
    elements.uploadPlaceholder.hidden = false;
    elements.imagePreview.hidden = true;
    updateGenerateButton();
}

// ===== UI Updates =====
function updateGenerateButton() {
    const hasImage = state.imageBase64 !== null;
    const hasPrompt = elements.promptInput.value.trim().length > 0;
    elements.generateBtn.disabled = !hasImage || !hasPrompt || state.isGenerating;
}

function showProgress(message, progress = 0) {
    elements.progressSection.hidden = false;
    elements.resultSection.hidden = true;
    elements.errorSection.hidden = true;
    elements.progressText.textContent = message;
    elements.progressFill.style.width = `${progress}%`;
}

function hideProgress() {
    elements.progressSection.hidden = true;
    stopTimer();
}

// ===== Timer Functions =====
function startTimer() {
    state.startTime = Date.now();
    elements.timerValue.textContent = '00:00';

    state.timerInterval = setInterval(() => {
        const elapsed = Date.now() - state.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        elements.timerValue.textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

// ===== Log Functions =====
function clearLogs() {
    if (elements.logsContent) {
        elements.logsContent.innerHTML = '';
    }
}

function addLog(message, status = 'pending') {
    if (!elements.logsContent) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${status}`;
    logEntry.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-status"></span>
        <span class="log-message">${message}</span>
    `;

    elements.logsContent.appendChild(logEntry);
    elements.logsContent.scrollTop = elements.logsContent.scrollHeight;

    return logEntry;
}

function updateLogStatus(logEntry, status) {
    if (logEntry) {
        logEntry.className = `log-entry ${status}`;
    }
}

function showResult(videoBase64) {
    // Convert base64 to blob
    const byteCharacters = atob(videoBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    state.videoBlob = new Blob([byteArray], { type: 'video/mp4' });

    // Create object URL and set video source
    const videoUrl = URL.createObjectURL(state.videoBlob);
    elements.resultVideo.src = videoUrl;

    // Show result section
    elements.progressSection.hidden = true;
    elements.resultSection.hidden = false;
    elements.errorSection.hidden = true;
}

function showError(message) {
    elements.progressSection.hidden = true;
    elements.resultSection.hidden = true;
    elements.errorSection.hidden = false;
    elements.errorText.textContent = message;
}

function resetUI() {
    clearImage();
    elements.promptInput.value = '';
    elements.progressSection.hidden = true;
    elements.resultSection.hidden = true;
    elements.errorSection.hidden = true;
    state.videoBlob = null;
    state.isGenerating = false;
    updateGenerateButton();
}

// ===== Video Generation =====
async function generateVideo() {
    if (state.isGenerating || !state.imageBase64) return;

    state.isGenerating = true;
    updateGenerateButton();

    // Clear previous logs and start timer
    clearLogs();
    startTimer();

    try {
        const aspectRatio = elements.aspectRatio.value;
        const duration = parseInt(elements.duration.value);
        const dimensions = CONFIG.ASPECT_RATIOS[aspectRatio];
        const numFrames = duration * CONFIG.FPS + 1; // +1 for the last frame

        showProgress('جاري البدء...', 5);

        // Log: Starting
        const logStart = addLog('بدء عملية التوليد', 'pending');
        addLog(`الأبعاد: ${dimensions.width}x${dimensions.height}`, 'done');
        addLog(`المدة: ${duration} ثواني (${numFrames} إطار)`, 'done');

        await new Promise(r => setTimeout(r, 500));
        updateLogStatus(logStart, 'done');

        // Log: Connecting
        const logConnect = addLog('الاتصال بخادم Modal...', 'pending');
        showProgress('جاري الاتصال بالخادم...', 10);

        // Log: Uploading
        const logUpload = addLog('رفع الصورة للمعالجة...', 'pending');
        showProgress('جاري رفع الصورة...', 15);

        // Simulate progress updates
        let currentProgress = 20;
        const progressInterval = setInterval(() => {
            if (currentProgress < 90) {
                currentProgress += 2;
                showProgress('جاري توليد الفيديو بواسطة AI...', currentProgress);
            }
        }, 15000); // Update every 15 seconds

        // Set 10 minute timeout for the request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 minutes

        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
                image: state.imageBase64,
                prompt: elements.promptInput.value.trim(),
                num_frames: numFrames,
                fps: CONFIG.FPS,
                width: dimensions.width,
                height: dimensions.height,
            }),
        });

        updateLogStatus(logConnect, 'done');
        updateLogStatus(logUpload, 'done');

        clearInterval(progressInterval);
        clearTimeout(timeoutId); // Clear the timeout since we got a response

        // Log: Response received
        const logProcess = addLog('معالجة الاستجابة...', 'pending');
        showProgress('جاري معالجة الفيديو...', 95);

        if (!response.ok) {
            updateLogStatus(logProcess, 'error');
            addLog(`خطأ HTTP: ${response.status}`, 'error');
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            updateLogStatus(logProcess, 'error');
            addLog(`خطأ: ${data.error}`, 'error');
            throw new Error(data.error || 'حدث خطأ أثناء توليد الفيديو');
        }

        updateLogStatus(logProcess, 'done');

        // Log: Success
        addLog(`تم التوليد بنجاح! (${data.duration?.toFixed(1) || duration}ث)`, 'done');
        showProgress('اكتمل!', 100);

        stopTimer();

        // Small delay to show 100%
        await new Promise(resolve => setTimeout(resolve, 500));

        showResult(data.video);

    } catch (error) {
        console.error('Generation error:', error);
        stopTimer();
        addLog(`فشل: ${error.message}`, 'error');
        showError(error.message || 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.');
    } finally {
        state.isGenerating = false;
        updateGenerateButton();
    }
}

// ===== Download =====
function downloadVideo() {
    if (!state.videoBlob) return;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `hunyuan_video_${timestamp}.mp4`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(state.videoBlob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    console.log('HunyuanVideo I2V initialized');

    // Check if API URL is configured
    if (CONFIG.API_URL.includes('YOUR_MODAL_USERNAME')) {
        console.warn('⚠️ API URL not configured! Please update CONFIG.API_URL in app.js');
    }
});
