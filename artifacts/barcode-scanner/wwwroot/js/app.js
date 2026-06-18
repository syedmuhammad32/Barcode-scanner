let html5QrCode = null;
let isScanning = false;

function isInIframe() {
    try { return window.self !== window.top; } catch (e) { return true; }
}

function showCameraError() {
    document.getElementById('errorCard').classList.remove('hidden');
    document.getElementById('resultCard').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('errorMsg').innerHTML =
        '📷 Camera access failed.<br>' +
        '<small style="color:#888;display:block;margin:6px 0 10px;">Camera does not work in preview mode — open in a new tab:</small>' +
        '<a href="' + window.location.href + '" target="_blank" style="display:inline-block;padding:10px 20px;background:#667eea;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem;">🔗 Open in New Tab</a>';
}

document.addEventListener('DOMContentLoaded', () => {
    if (isInIframe()) {
        const notice = document.createElement('div');
        notice.style.cssText = 'background:#fffbeb;border:2px solid #f6ad55;border-radius:12px;padding:12px 16px;margin-bottom:14px;text-align:center;font-size:0.88rem;color:#744210;line-height:1.5;';
        notice.innerHTML = '⚠️ For camera scanning, <a href="' + window.location.href + '" target="_blank" style="color:#667eea;font-weight:700;text-decoration:underline;">open in a new tab</a>.<br>Manual entry and sample buttons work here too. ✅';
        document.querySelector('.container').insertBefore(notice, document.querySelector('.scanner-section'));
    }
});

function showResult(data) {
    document.getElementById('resultCard').classList.remove('hidden');
    document.getElementById('errorCard').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('resMaterial').textContent = data.materialCode || data.barcode;
    document.getElementById('resName').textContent = data.name;
    document.getElementById('resCapacity').textContent = data.capacity || '—';
    document.getElementById('resPrice').textContent = data.price;
}

function showError(msg) {
    document.getElementById('errorCard').classList.remove('hidden');
    document.getElementById('resultCard').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('errorMsg').textContent = msg;
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('resultCard').classList.add('hidden');
    document.getElementById('errorCard').classList.add('hidden');
}

async function lookupBarcode(barcode) {
    showLoading();
    try {
        const res = await fetch(`/api/lookup/${encodeURIComponent(barcode)}`);
        const data = await res.json();
        if (res.ok) {
            showResult(data);
        } else {
            showError(data.message || 'Product not found in the database.');
        }
    } catch (err) {
        showError('Could not connect to the server. Please try again.');
    }
}

function lookupManual() {
    const val = document.getElementById('manualInput').value.trim();
    if (!val) {
        showError('Please enter a barcode first.');
        return;
    }
    lookupBarcode(val);
}

function testBarcode(code) {
    document.getElementById('manualInput').value = code;
    lookupBarcode(code);
}

function switchTab(tab) {
    document.getElementById('cameraPanel').classList.toggle('hidden', tab !== 'camera');
    document.getElementById('filePanel').classList.toggle('hidden', tab !== 'file');
    document.getElementById('tabCamera').classList.toggle('active', tab === 'camera');
    document.getElementById('tabFile').classList.toggle('active', tab === 'file');
    if (tab !== 'camera') stopScanner();
}

async function scanFromFile(input) {
    const file = input.files[0];
    if (!file) return;
    showLoading();
    try {
        const scanner = new Html5Qrcode("reader");
        const result = await scanner.scanFile(file, false);
        await scanner.clear();
        document.getElementById('manualInput').value = result;
        lookupBarcode(result);
    } catch (err) {
        showError('No barcode found in the image. Please upload a clear, well-lit barcode photo.');
    }
    input.value = '';
}

async function startScanner() {
    if (isScanning) return;

    html5QrCode = new Html5Qrcode("reader");

    document.getElementById('startBtn').classList.add('hidden');
    document.getElementById('stopBtn').classList.remove('hidden');

    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 150 },
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                ]
            },
            (decodedText) => {
                stopScanner();
                document.getElementById('manualInput').value = decodedText;
                lookupBarcode(decodedText);
            },
            () => {}
        );
        isScanning = true;
    } catch (err) {
        document.getElementById('startBtn').classList.remove('hidden');
        document.getElementById('stopBtn').classList.add('hidden');
        const errName = err?.name || '';
        const errMsg = err?.message || String(err);
        const isHttps = location.protocol === 'https:';

        let msg = '📷 Camera access failed.<br>';
        msg += `<small style="color:#888;display:block;margin:4px 0 2px;">Error: ${errName} — ${errMsg}</small>`;
        msg += `<small style="color:#888;display:block;margin:0 0 10px;">Protocol: ${location.protocol} | Host: ${location.hostname}</small>`;

        if (!isHttps) {
            msg += '<span style="color:#c53030;">⚠️ Camera requires HTTPS. Please use a secure connection.</span><br>';
        }
        if (errName === 'NotAllowedError') {
            msg += '<span style="color:#c53030;">Permission denied. Click the camera icon in the address bar to allow access.</span><br>';
        }
        if (errName === 'NotFoundError') {
            msg += '<span style="color:#c53030;">No camera device found. Please connect a webcam or use a mobile device.</span><br>';
        }

        document.getElementById('errorCard').classList.remove('hidden');
        document.getElementById('resultCard').classList.add('hidden');
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('errorMsg').innerHTML = msg;
    }
}

async function stopScanner() {
    if (html5QrCode && isScanning) {
        await html5QrCode.stop();
        html5QrCode.clear();
        isScanning = false;
    }
    document.getElementById('startBtn').classList.remove('hidden');
    document.getElementById('stopBtn').classList.add('hidden');
}

document.getElementById('manualInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') lookupManual();
});
