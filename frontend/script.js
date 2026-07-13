/**
 * DocuMind AI - Core Logic
 * Developer: Md Sharik Ansari
 */

// ==========================================
// Initial Setup & Configurations
// ==========================================
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Global State
let currentDocumentContext = "";
let analysisHistory = JSON.parse(localStorage.getItem('docuMindHistory')) || [];

// DOM Elements
const documentInput = document.getElementById('document-input');
const analyzeBtn = document.getElementById('analyze-btn');
const outputContent = document.getElementById('streaming-content');
const placeholder = document.getElementById('placeholder-text');
const loadingContainer = document.getElementById('loading-container');
const progressBar = document.getElementById('progress-bar');
const analysisTypeSelect = document.getElementById('analysis-type');

// ==========================================
// Theme Management
// ==========================================
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    document.body.classList.remove('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    document.body.classList.toggle('dark-mode');
    const isLight = document.body.classList.contains('light-mode');
    themeToggle.innerHTML = isLight ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// ==========================================
// Toast Notification System
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// Mobile Sidebar Toggles
// ==========================================
const leftSidebar = document.getElementById('history-sidebar');
const rightSidebar = document.getElementById('chat-sidebar');

document.getElementById('open-history-mobile').addEventListener('click', () => {
    leftSidebar.classList.add('open');
});
document.getElementById('close-history').addEventListener('click', () => {
    leftSidebar.classList.remove('open');
});

document.getElementById('open-chat-mobile').addEventListener('click', () => {
    rightSidebar.classList.add('open');
});
document.getElementById('close-chat').addEventListener('click', () => {
    rightSidebar.classList.remove('open');
});

// ==========================================
// Real-time Document Statistics
// ==========================================
documentInput.addEventListener('input', updateStats);

function updateStats() {
    const text = documentInput.value;
    const charCount = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const readTime = Math.ceil(words / 200); // Avg 200 wpm
    
    // Simple Language Detection (English vs Hindi based on Devanagari Unicode range)
    const hasHindi = /[\u0900-\u097F]/.test(text);
    const lang = charCount === 0 ? "Auto" : (hasHindi ? "Hindi" : "English");

    document.getElementById('word-count').innerText = words.toLocaleString();
    document.getElementById('char-count').innerText = charCount.toLocaleString();
    document.getElementById('read-time').innerText = `${readTime} min`;
    document.getElementById('lang-detect').innerText = lang;

    // Enable chat input if document has text
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    if (charCount > 50) {
        currentDocumentContext = text;
        chatInput.disabled = false;
        sendChatBtn.disabled = false;
    } else {
        chatInput.disabled = true;
        sendChatBtn.disabled = true;
    }
}

// ==========================================
// File Upload & Drag-and-Drop Parsing
// ==========================================
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-upload');
const fileNameDisplay = document.getElementById('file-name');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length) handleFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

async function handleFile(file) {
    if (!file) return;

    fileNameDisplay.textContent = `File selected: ${file.name}`;
    documentInput.value = "Extracting text from file, please wait...";
    updateStats();

    const fileExtension = file.name.split('.').pop().toLowerCase();

    try {
        if (fileExtension === 'txt' || fileExtension === 'csv') {
            const reader = new FileReader();
            reader.onload = (e) => { 
                documentInput.value = e.target.result; 
                updateStats();
                showToast("Text extracted successfully!");
            };
            reader.readAsText(file);
        } 
        else if (fileExtension === 'pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(" ");
                fullText += pageText + "\n";
            }
            documentInput.value = fullText;
            updateStats();
            showToast("PDF extracted successfully!");
        } 
        else if (fileExtension === 'docx') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            documentInput.value = result.value;
            updateStats();
            showToast("Word document extracted successfully!");
        } 
        else {
            documentInput.value = "";
            showToast("Unsupported file format. Please upload PDF, DOCX, or TXT.", "error");
        }
    } catch (error) {
        console.error("Error reading file:", error);
        documentInput.value = "";
        showToast("Failed to extract text. File might be corrupted or encrypted.", "error");
    }
}

// ==========================================
// Core Analyze Logic (Streaming)
// ==========================================
analyzeBtn.addEventListener('click', async () => {
    const text = documentInput.value.trim();
    const analysisType = analysisTypeSelect.value;
    
    if (!text) { 
        showToast("Please input some text or upload a document.", "warning"); 
        return; 
    }

    analyzeBtn.disabled = true; 
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    placeholder.style.display = "none"; 
    outputContent.innerHTML = "";
    
    loadingContainer.classList.remove('hidden');
    progressBar.style.width = "0%";
    
    // Simulate Progress Bar
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressBar.style.width = `${progress}%`;
    }, 500);

    let accumulatedText = "";

    try {
        const response = await fetch("http://127.0.0.1:8000/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                text: text,
                analysis_type: analysisType 
            })
        });

        if (!response.ok) throw new Error("Server responded with an error.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) { 
                const chunk = decoder.decode(value, { stream: true });
                accumulatedText += chunk;
                // Render markdown dynamically
                outputContent.innerHTML = marked.parse(accumulatedText);
                
                // Auto scroll to bottom during stream
                const outputBox = document.getElementById('output-box');
                outputBox.scrollTop = outputBox.scrollHeight;
            }
        }
        
        progressBar.style.width = "100%";
        showToast("Analysis completed successfully!");
        
        // Save to History
        saveToHistory(analysisType, accumulatedText);

    } catch (error) {
        outputContent.innerHTML = `<p style="color: var(--danger);"><i class="fas fa-exclamation-triangle"></i> Error processing document. Ensure backend is running.</p>`;
        showToast("Failed to connect to the backend server.", "error");
    } finally {
        clearInterval(progressInterval);
        setTimeout(() => loadingContainer.classList.add('hidden'), 500);
        analyzeBtn.disabled = false; 
        analyzeBtn.innerHTML = '<i class="fas fa-magic"></i> Analyze Document';
    }
});

// ==========================================
// Output Tools (Copy, Download, Print)
// ==========================================
document.getElementById('copy-btn').addEventListener('click', () => {
    if (!outputContent.innerText) return showToast("Nothing to copy!", "warning");
    navigator.clipboard.writeText(outputContent.innerText).then(() => {
        showToast("Copied to clipboard!");
    });
});

document.getElementById('download-txt-btn').addEventListener('click', () => {
    if (!outputContent.innerText) return showToast("Nothing to download!", "warning");
    const blob = new Blob([outputContent.innerText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DocuMind_Analysis_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("TXT Downloaded!");
});

document.getElementById('download-pdf-btn').addEventListener('click', () => {
    if (!outputContent.innerText) return showToast("Nothing to download!", "warning");
    const element = document.getElementById('output-box');
    const opt = {
        margin:       1,
        filename:     `DocuMind_Analysis_${new Date().getTime()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    showToast("Generating PDF...");
    html2pdf().set(opt).from(element).save().then(() => {
        showToast("PDF Downloaded successfully!");
    });
});

document.getElementById('print-btn').addEventListener('click', () => {
    if (!outputContent.innerText) return showToast("Nothing to print!", "warning");
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>DocuMind Print</title>');
    printWindow.document.write('<style>body{font-family: Arial, sans-serif; padding: 20px;} h1, h2, h3{color: #333;}</style>');
    printWindow.document.write('</head><body >');
    printWindow.document.write('<h2>DocuMind AI Analysis Report</h2><hr/>');
    printWindow.document.write(outputContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
});

document.getElementById('share-btn').addEventListener('click', async () => {
    if (!outputContent.innerText) return showToast("Nothing to share!", "warning");
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'DocuMind AI Analysis',
                text: 'Check out this document analysis generated by DocuMind AI:\n\n' + outputContent.innerText.substring(0, 100) + '...',
            });
            showToast("Shared successfully!");
        } catch (err) {
            console.log('Share canceled', err);
        }
    } else {
        showToast("Web Share API not supported on this browser.", "error");
    }
});

// ==========================================
// History Management System
// ==========================================
function saveToHistory(type, result) {
    const item = {
        id: Date.now(),
        title: `Analysis: ${type.replace('_', ' ').toUpperCase()}`,
        date: new Date().toLocaleString(),
        content: result
    };
    analysisHistory.unshift(item);
    if (analysisHistory.length > 20) analysisHistory.pop(); // Keep last 20
    localStorage.setItem('docuMindHistory', JSON.stringify(analysisHistory));
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    if (analysisHistory.length === 0) {
        historyList.innerHTML = '<p style="color: var(--text-muted); text-align: center; font-size: 0.9rem; margin-top: 20px;">No recent history.</p>';
        return;
    }

    analysisHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-info" onclick="loadHistoryItem(${item.id})">
                <div class="history-title" title="${item.title}">${item.title}</div>
                <div class="history-date">${item.date}</div>
            </div>
            <button class="delete-history-btn" onclick="deleteHistoryItem(${item.id})" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        `;
        historyList.appendChild(div);
    });
}

window.loadHistoryItem = function(id) {
    const item = analysisHistory.find(i => i.id === id);
    if (item) {
        placeholder.style.display = "none";
        outputContent.innerHTML = marked.parse(item.content);
        showToast("History loaded!");
        // Auto close sidebar on mobile
        if(window.innerWidth <= 992) leftSidebar.classList.remove('open');
        // Scroll to output
        document.querySelector('.output-section').scrollIntoView({ behavior: 'smooth' });
    }
};

window.deleteHistoryItem = function(id) {
    analysisHistory = analysisHistory.filter(i => i.id !== id);
    localStorage.setItem('docuMindHistory', JSON.stringify(analysisHistory));
    renderHistory();
    showToast("Item deleted.");
};

document.getElementById('clear-history-btn').addEventListener('click', () => {
    if (confirm("Are you sure you want to clear all history?")) {
        analysisHistory = [];
        localStorage.removeItem('docuMindHistory');
        renderHistory();
        showToast("History cleared successfully.");
    }
});

// Initial Render
renderHistory();

// ==========================================
// Chat with Document Feature
// ==========================================
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const chatHistory = document.getElementById('chat-history');

function appendChatMessage(message, sender = 'user') {
    const div = document.createElement('div');
    div.className = `chat-message ${sender}-message`;
    
    let parsedMessage = message;
    if (sender === 'ai') {
        parsedMessage = marked.parse(message);
    }
    
    div.innerHTML = `<div class="message-content">${parsedMessage}</div>`;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return div.querySelector('.message-content');
}

async function handleChat() {
    const question = chatInput.value.trim();
    if (!question) return;
    
    if (!currentDocumentContext) {
        showToast("Please upload a document or paste text first.", "warning");
        return;
    }

    // Append User Message
    appendChatMessage(question, 'user');
    chatInput.value = '';
    
    // Disable input while generating
    chatInput.disabled = true;
    sendChatBtn.disabled = true;

    // Create placeholder for AI response
    const aiMessageNode = appendChatMessage('<i class="fas fa-ellipsis-h fa-fade"></i>', 'ai');
    let accumulatedResponse = "";

    try {
        const response = await fetch("http://127.0.0.1:8000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                document_context: currentDocumentContext,
                question: question 
            })
        });

        if (!response.ok) throw new Error("Chat backend error.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;

        aiMessageNode.innerHTML = ""; // Clear loader

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) { 
                const chunk = decoder.decode(value, { stream: true });
                accumulatedResponse += chunk;
                aiMessageNode.innerHTML = marked.parse(accumulatedResponse);
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
        }
    } catch (error) {
        aiMessageNode.innerHTML = `<span style="color: var(--danger);">Connection error. Make sure the backend is running.</span>`;
    } finally {
        chatInput.disabled = false;
        sendChatBtn.disabled = false;
        chatInput.focus();
    }
}

sendChatBtn.addEventListener('click', handleChat);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChat();
});