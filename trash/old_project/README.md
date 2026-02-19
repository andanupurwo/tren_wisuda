# Aplikasi Tren & Prediksi Peserta Wisuda

## Fitur
- Memuat data Excel dari folder `history_peserta_wisuda`
- Visualisasi tren total peserta per periode
- Analisis berdasarkan kolom (fakultas, prodi, dll.) bila tersedia
- Prediksi jumlah peserta untuk beberapa periode ke depan

## Menjalankan Aplikasi
1. Instal dependensi:
   ```
   python -m pip install -r requirements.txt
   ```
2. (Opsional) Impor Excel ke SQLite:
   ```
   python import_to_sqlite.py
   ```
3. Jalankan aplikasi:
   ```
   python -m streamlit run app.py
   ```

## Catatan
- Nama file Excel akan dipindai untuk mendapatkan nomor periode, contoh: `Peserta Wisuda Periode 97 ... .xlsx`.
- Jika kolom tambahan tidak tersedia, aplikasi tetap menampilkan tren total.
- Jika database SQLite tersedia, aktifkan opsi **Gunakan database SQLite** di sidebar.
