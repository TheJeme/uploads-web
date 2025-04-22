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

export async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const progressBar = document.querySelector('.progress');
    const uploadButton = document.getElementById('uploadButton');
    const file = fileInput.files[0];

    if (!file) {
        return;
    }

    progressBar.style.width = '0%';
    uploadButton.disabled = true;
    toggleSpinner(true);

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
    } finally {
        uploadButton.disabled = false;
        toggleSpinner(false);
    }
}
