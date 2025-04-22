import config from './config.js';
const AWS = window.AWS;

// AWS Configuration
AWS.config.update({
    region: config.region,
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: config.identityPoolId
    })
});

new AWS.S3({
    params: { Bucket: config.bucket },
    region: config.region
});

// Setup event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');

    fileInput.addEventListener('change', e => {
        showFileName(e.target);
        uploadButton.disabled = !e.target.files.length;
    });

    uploadButton.addEventListener('click', uploadFile);
});

function toggleSpinner(show) {
    const spinner = document.getElementById('spinner');
    const uploadIcon = document.querySelector('.upload-button .fa-upload');
    spinner.style.display = show ? 'inline-block' : 'none';
    uploadIcon.style.display = show ? 'none' : 'inline-block';
}

export function showFileName(input) {
    const fileName = document.getElementById('fileName');
    if (input.files && input.files[0]) {
        fileName.textContent = input.files[0].name;
        fileName.classList.add('visible');
    } else {
        fileName.textContent = '';
        fileName.classList.remove('visible');
    }
}

export function showNotification(message, success = true) {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "bottom",
        position: "right",
        style: {
            background: success ? "linear-gradient(to right, #00b09b, #96c93d)" : "linear-gradient(to right, #ff5f6d, #ffc371)",
            borderRadius: "10px",
            padding: "12px 24px",
            boxShadow: "0 3px 6px rgba(0,0,0,0.16)",
        }
    }).showToast();
}

function getFileUrl(key) {
    return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

function getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
}

function generateId(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(crypto.getRandomValues(new Uint8Array(length)))
        .map(x => chars[x % chars.length])
        .join('');
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('Link copied to clipboard!', true);
    } catch (err) {
        showNotification('Failed to copy link', false);
    }
}

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB in bytes

function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const progressBar = document.querySelector('.progress');
    const uploadButton = document.getElementById('uploadButton');
    const uploadResult = document.getElementById('uploadResult');
    const file = fileInput.files[0];

    if (!file) {
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showNotification(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`, false);
        return;
    }

    progressBar.style.width = '0%';
    uploadButton.disabled = true;
    toggleSpinner(true);
    
    try {
        const fileExtension = getFileExtension(file.name);
        const key = `${generateId()}.${fileExtension}`;

        // Direct S3 upload using AWS SDK
        const upload = new AWS.S3.ManagedUpload({
            params: {
                Bucket: config.bucket,
                Key: key,
                Body: file,
                ContentType: file.type
            }
        });

        upload.on('httpUploadProgress', (progress) => {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            progressBar.style.width = `${percentage}%`;
        });

        await upload.promise();
        progressBar.style.width = '100%';
        const fileUrl = getFileUrl(key);
        
        // Show result section
        const resultLink = uploadResult.querySelector('.result-link');
        const fileUrlSpan = uploadResult.querySelector('.file-url');
        resultLink.href = fileUrl;
        fileUrlSpan.textContent = file.name;
        uploadResult.style.display = 'flex';
        
        // Setup copy button
        const copyButton = uploadResult.querySelector('.copy-button');
        copyButton.onclick = () => copyToClipboard(fileUrl);
        
        showNotification('File uploaded successfully!', true);
    } catch (err) {
        console.error(err);
        showNotification('Upload failed: ' + err.message, false);
        progressBar.style.width = '0%';
        uploadResult.style.display = 'none';
    } finally {
        uploadButton.disabled = false;
        toggleSpinner(false);
    }
}
