let html5QrCode = null;
let isScanning = false;

function showIframeError() {
    document.getElementById('errorCard').classList.remove('hidden');
    document.getElementById('resultCard').classList.add('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('errorMsg').innerHTML =
        '📷 Camera sirf naye tab mein kaam karta hai.<br><br>' +
        '<a href="' + window.location.href + '" target="_blank" style="display:inline-block;margin-top:8px;padding:10px 18px;background:#667eea;color:white;border-radius:8px;text-decoration:none;font-weight:600;">🔗 Naye Tab Mein Kholo</a>';
}

if (window !== window.top) {
    document.addEventListener('DOMContentLoaded', () => {
        const notice = document.createElement('div');
        notice.style.cssText = 'background:#fffbeb;border:2px solid #f6ad55;border-radius:12px;padding:14px 16px;margin-bottom:16px;text-align:center;font-size:0.88rem;color:#744210;';
        notice.innerHTML = '⚠️ Camera scan ke liye <a href="' + window.location.href + '" target="_blank" style="color:#667eea;font-weight:700;">naye tab mein kholen</a>. Manual barcode ya sample buttons abhi bhi kaam kartay hain.';
        document.querySelector('.container').insertBefore(notice, document.querySelector('.scanner-section'));
    });
}

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
        const isInIframe = window !== window.top;
        if (isInIframe) {
            showIframeError();
        } else {
            showError('Camera access nahi ho saka. Browser mein camera permission allow karein aur dobara koshish karein.');
        }
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
