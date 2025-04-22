// Load environment variables
require('dotenv').config();

import config from './config.js';
const AWS = window.AWS;

// AWS Configuration
AWS.config.update({
    region: config.region,
    credentials: new AWS.Credentials({
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretKey
    })
});

const s3 = new AWS.S3();

// Make functions global
window.showFileName = function(input) {
    const fileName = document.getElementById('fileName');
    if (input.files && input.files[0]) {
        fileName.textContent = input.files[0].name;
        fileName.classList.add('visible');
    } else {
        fileName.textContent = '';
        fileName.classList.remove('visible');
    }
}

window.showNotification = function(message, success = true) {
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

window.uploadFile = async function() {
    const fileInput = document.getElementById('fileInput');
    const progressBar = document.querySelector('.progress');
    const file = fileInput.files[0];

    if (!file) {
        return;
    }

    progressBar.style.width = '0%';

    try {
        const params = {
            Bucket: 'uploads-jeme',
            Key: file.name,
            ContentType: file.type
        };

        // Generate presigned URL
        const presignedUrl = await s3.getSignedUrlPromise('putObject', params);

        // Upload directly to S3 using presigned URL
        const response = await fetch(presignedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });

        if (!response.ok) throw new Error('Upload failed');

        progressBar.style.width = '100%';
        showNotification('File uploaded successfully!', true);
    } catch (err) {
        console.error(err);
        showNotification('Upload failed: ' + err.message, false);
        progressBar.style.width = '0%';
    }
}
