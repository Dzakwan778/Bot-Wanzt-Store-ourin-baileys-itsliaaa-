Sepertinya kita akan menunda dulu untuk bagian payment gateway, dikarenakan saya mendapatkan ajakan yang lumayan menarik yaitu untuk menyewa bot ini, jadi saya rasa kita perlu meningkatkan fleksibilitas dari bot ini agar dapat di customisasi oleh pengguna nantinya.

---

# Penambahan Fitur

---

## Tab Store Info

Tambahkan 1 tab lagi sebelum tab Command. Beri nama tan tersebut dengan "Store Info". Fungsi dari tab tersebut adalah untuk memudahkan penyewa untuk mengatur info dari store milik mereka sendiri tanpa perlu melakukan hardcode, jadi saya ingin tab tersebut akan memuat info yaitu nama store mereka, nama owner dari store tersebut, nomer dan nama admin dari store tersebut, nomer owner dari store tersebut, nomer/username bot telegram, link saluran WhatsApp, dan link website dari store tersebut.

Jadi untuk hal tersebut, saya ingin pada tab tersebut terdapat beberapa form pengisian untuk mengisi data tersebut, saya ingin beberapa form bersifat opsional, artinya form tersebut dapat di isi atau di kosongkan, berikut daftar form yang bersifat opsional:
- nomer dan nama admin
- link website
- nomer bot telegram
- link saluran

---

## Penambahan Placeholder

Tambahkan beberapa placeholder untuk memudahkan customisasi.output dari setiap command, seluruh data yang di ambil dari placeholder berasal dari tab "Store Info". Berikut adalah beberapa placeholder yang ingin saya tambahkan beserta fungsinya:
- {storeName} → mengambil data dari form Nama Store yang berada di tab "Store Info"
- {ownerName} → mengambil data dari form Nama Owner yang berada di tab "Store Info"
- {ownerNumber} → mengambil data dari form Nomer Owner
- {waLink} → mengambil data dari form Link Saluran WhatsApp
- {webLink} → mengambil data dari form Link website
- {adminNumber} → mengambil data dari form Nomer Admin

### Ketentuan Placeholder

Placeholder harus dapat di aplikasikan dan kompatibel dengan seluruh output pesan balasan bot baik berupa text biasa, tombol interaktif, ataupun caraousel, sehingga Placeholder dapat di gunakan untuk melakukan customisasi output bot dengan mendapatkan info store secara cepat.

### Contoh Penerapan

**Pesan Berupa Text**
``` Input
*{storeName}*

*{produkName} | {category}*

Nikmati produk pilihanmu dengan harga terbaik di {storeName}.

*Detail Produk:*
- Varian: {varian}
- Harga: {price}
- Stok: {stock} tersedia

Produk tersedia selama stok masih ada. Silakan hubungi admin jika mengalami kendala: {adminNumber}
```

``` output
*Wanzt Store*

*YouTube | Streaming*

Nikmati produk pilihanmu dengan harga terbaik di Wanzt Store.

*Detail Produk:*
- Varian: YouTube Famplan Email Buyer 1 Bulam
- Harga: Rp22.000
- Stok: 13 tersedia

Produk tersedia selama stok masih ada. Silakan hubungi admin jika mengalami kendala: 08123456789
```

**Pesan Berupa Tombol**
Seluruh pesan berupa tombol dapat di isi dengan input berupa placeholder, sehingga akan memudahkan pengguna untuk melakukan setup. Misal jika input Nomer WhatsApp Kontak pada tombol vCard Kontak di isi dengan placeholder {ownerNumber}, maka bot mengirimkan output balasan berupa vCard yang berisi nomer susai dengan yang di isi pada form Nomer Owner

### Kesimpulan

Saya ingin seluruh placeholder dapat di gunakan di seluruh fitur bot yang berkaitan dengan output dari command.

---

# Penyesuaian Fitur

---

## Footer

Setiap output yang di kirimkan oleh bot selalu terdapat footer di bawahnya, saya ingin di tab Command, pada masing-masing PILIHAN COMMAND, tambahkan form untuk menambahkan footer, jadi pengguna dapat melakukan customisasi secara menyeluruh mulai dari pesan utama hingga footer nya, saya ingin footer ini dapat menggunakan seluruh placeholder yang tersedia dari bot ini, sehingga akan memudahkan pengguna dalam mendapatkan info dari bot ini dengan memasukkan placeholder yang tersedia, contoh dari footer yang menggunakan placeholder adalah:
``` Input
{webLink} • otomatis
```
maka outputnya adalah:
``` Output
wanztstore.web.id • otomatis
```