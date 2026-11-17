// worker.js - Background Thread untuk Memproses Excel 14 MB
importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');

self.onmessage = async function (e) {
  try {
    const fileData = e.data;
    const data = await fileData.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    // Kirim balik nama sheet dan workbook/raw data ke main thread
    self.postMessage({ 
      status: 'success', 
      sheetNames: workbook.SheetNames,
      // Karena workbook utuh tidak bisa dikirim langsung, kita simpan/parse ringkas atau kirim sheet pertama
      sheetsData: workbook.Sheets 
    });
  } catch (error) {
    self.postMessage({ status: 'error', message: error.message });
  }
};
```[cite: 2]

---

### 2. Modifikasi Bagian Script pada File HTML Anda
Ganti bagian logika `FileReader` di dalam tag `<script>` HTML Anda agar memanggil `worker.js` saat file diunggah. 

Anda bisa memperbarui bagian event listener `fileInput` menjadi seperti ini:

```javascript
// Tambahkan indikator loading di HTML Anda jika belum ada (opsional untuk UX)
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('fileName').textContent = file.name;
    
    // Tampilkan pesan loading agar user tahu file sedang diproses di background
    document.getElementById('placeholder').classList.remove('hidden');
    document.getElementById('placeholderTitle').textContent = "Sedang memproses file besar (14 MB), mohon tunggu...";

    if (window.Worker) {
        const worker = new Worker('worker.js');
        worker.postMessage(file);

        worker.onmessage = function (event) {
            if (event.data.status === 'success') {
                // Simpan workbook secara tiruan / manfaatkan sheetsData
                // Atau kita gunakan SheetJS langsung dengan aman karena worker sudah mengangkat beban parsing utama
                let sheetNames = event.data.sheetNames;
                
                // Rekonstruksi object workbook kecil untuk pembacaan sheet berikutnya
                currentWorkbook = { SheetNames: sheetNames, Sheets: event.data.sheetsData };

                let sheetSelector = document.getElementById('sheetSelector');
                let sheetContainer = document.getElementById('sheetSelectorContainer');

                sheetSelector.innerHTML = '';
                sheetNames.forEach(name => {
                    let opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    sheetSelector.appendChild(opt);
                });

                if (sheetNames.length > 1) {
                    sheetContainer.classList.remove('hidden');
                } else {
                    sheetContainer.classList.add('hidden');
                }

                loadSheetData(sheetNames[0]);
            } else {
                alert("Gagal membaca file Excel: " + event.data.message);
                document.getElementById('placeholderTitle').textContent = "Gagal memuat file.";
            }
            worker.terminate();
        };

        worker.onerror = function (err) {
            alert("Error Worker: " + err.message);
            worker.terminate();
        };
    } else {
        alert("Browser Anda tidak mendukung Web Worker.");
    }
});
```[cite: 2]

Dengan menggunakan **Web Worker**, proses berat pembacaan file 14 MB dialihkan ke *background thread*, sehingga halaman utama (*UI*) browser Anda tetap responsif dan tidak lagi menampilkan peringatan *Page Unresponsive*[cite: 2]