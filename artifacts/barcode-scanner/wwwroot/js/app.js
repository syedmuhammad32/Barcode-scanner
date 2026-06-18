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
        '📷 Camera access nahi ho saka.<br>' +
        '<small style="color:#888;display:block;margin:6px 0 10px;">Preview mein camera nahi chalta — naye tab mein kholen:</small>' +
        '<a href="' + window.location.href + '" target="_blank" style="display:inline-block;padding:10px 20px;background:#667eea;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem;">🔗 Naye Tab Mein Kholen</a>';
}

document.addEventListener('DOMContentLoaded', () => {
    if (isInIframe()) {
        const notice = document.createElement('div');
        notice.style.cssText = 'background:#fffbeb;border:2px solid #f6ad55;border-radius:12px;padding:12px 16px;margin-bottom:14px;text-align:center;font-size:0.88rem;color:#744210;line-height:1.5;';
        notice.innerHTML = '⚠️ Camera ke liye <a href="' + window.location.href + '" target="_blank" style="color:#667eea;font-weight:700;text-decoration:underline;">naye tab mein kholen</a>.<br>Manual barcode aur sample buttons yahan bhi kaam karte hain. ✅';
        document.querySelector('.container').insertBefore(notice, document.querySelector('.scanner-section'));
    }
});

function showResult(data) {
    document.getElementById('resultCard').classList.remove('hidden');
    document.getElementById('errorCard').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('resBarcode').textContent = data.barcode;
    document.getElementById('resName').textContent = data.name;
    document.getElementById('resPrice').textContent = 'PKR ' + data.price;
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
            showError(data.message || 'Barcode nahi mila database mein');
        }
    } catch (err) {
        showError('Server se rabta nahi ho saka. Dobara koshish karein.');
    }
}

function lookupManual() {
    const val = document.getElementById('manualInput').value.trim();
    if (!val) {
        showError('Pehle barcode likhein');
        return;
    }
    lookupBarcode(val);
}

function testBarcode(code) {
    document.getElementById('manualInput').value = code;
    lookupBarcode(code);
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
            (errorMessage) => {
            }
        );
        isScanning = true;
    } catch (err) {
        document.getElementById('startBtn').classList.remove('hidden');
        document.getElementById('stopBtn').classList.add('hidden');
        showCameraError();
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
