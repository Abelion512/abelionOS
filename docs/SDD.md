# Software Design Document (SDD)

## 1. Tujuan Desain

SDD ini menerjemahkan kebutuhan PRD dan SRS menjadi desain teknis yang dapat diimplementasikan. Desain saat ini mempertahankan frontend-only untuk MVP, tetapi memisahkan vocabulary domain dan boundary komponen agar integrasi backend dapat ditambahkan tanpa membongkar UI utama.

## 2. Arsitektur Tingkat Tinggi

```text
Browser
  └── React App
      ├── App Router
      ├── Theme Provider
      ├── Home Dashboard
      │   ├── Navigation Shell
      │   ├── System Health Module
      │   ├── Weather Module
      │   ├── Quick Launch Module
      │   ├── Activity Module
      │   └── Calendar Module
      ├── UI primitives / shadcn
      └── Toast feedback

Future Full-stack Boundary
  ├── Auth service
  ├── System metrics adapter
  ├── File Storage service
  ├── Calendar adapter
  └── Weather adapter
```

## 3. Struktur Direktori

| Lokasi | Tanggung jawab |
|---|---|
| `client/src/App.tsx` | Theme provider, error boundary, route utama |
| `client/src/pages/Home.tsx` | Komposisi dashboard dan local interaction state |
| `client/src/index.css` | Design tokens, responsive layout, interaction states |
| `client/src/components/ui/` | Primitive UI reusable dari template |
| `client/src/contexts/` | Theme dan context lintas halaman |
| `client/public/` | File konfigurasi kecil saja |
| `docs/` | PRD, SRS, SDD, UI/UX, dan task breakdown |

## 4. Modul Utama

### 4.1 Navigation Shell

Sidebar desktop memiliki brand mark, primary navigation, quick tip, settings, help, dan profile. Pada mobile, sidebar berubah menjadi drawer yang dibuka melalui menu button dan ditutup melalui close button atau scrim.

### 4.2 System Health

System health adalah panel dominan yang berisi status semantic, metadata mesin, serta progress resource. Warna Mint Leaf digunakan untuk healthy state dan progress. Pada integrasi nyata, modul ini akan menerima `SystemHealth` melalui adapter, bukan mengambil data secara langsung dari JSX.

### 4.3 Quick Launch

Quick launch memakai data array terstruktur yang berisi nama, deskripsi, icon, dan tone. Search state memfilter data berdasarkan nama. Aksi aplikasi pada MVP menghasilkan toast; versi berikutnya dapat memanggil deep link, route, atau backend command broker yang aman.

### 4.4 Activity dan Calendar

Activity dan calendar menggunakan daftar data terurut yang dirender sebagai row. Struktur ini sengaja tidak mengikat komponen pada provider tertentu sehingga adapter kalender atau audit log dapat ditambahkan kemudian.

## 5. State Management

State lokal digunakan untuk `activeNav`, `sidebarOpen`, `notificationsOpen`, `focusMode`, dan `query`. State server di masa depan harus dipisahkan dari state presentasi menggunakan query layer atau service hook. Perubahan state tidak boleh dilakukan pada fase render.

## 6. Data Flow Future

```text
External provider / backend
        ↓
Typed adapter / API client
        ↓
Feature hook: useSystemHealth / useActivity / useCalendar
        ↓
Dashboard module
        ↓
Loading, success, empty, error, offline states
```

File Storage akan menggunakan boundary terpisah: `FileStorageService` menangani presigned upload atau managed upload, sedangkan `FilesModule` hanya mengenal metadata file, progress, error, dan callback refresh.

## 7. Keputusan Teknologi

| Keputusan | Alasan |
|---|---|
| React + TypeScript | Komponen terstruktur dan type safety |
| Wouter | Routing ringan untuk aplikasi dashboard |
| Tailwind 4 + CSS custom properties | Token design dan responsive styling yang eksplisit |
| Lucide React | Icon monoline konsisten dengan system glyphs |
| Sonner | Feedback aksi yang ringan dan non-blocking |
| Generated storage assets | Hero dan brand asset dapat digunakan konsisten pada lifecycle project |

## 8. Error Handling

Error pada navigasi placeholder dikomunikasikan melalui toast. Untuk provider eksternal, error harus dipetakan ke copy yang actionable, misalnya status unavailable, retry, atau last known value. Error boundary tetap menjadi fallback untuk crash tingkat aplikasi.

## 9. Security dan Privacy

MVP tidak menyimpan credential atau data sensitif. Saat backend ditambahkan, token provider harus berada di server, endpoint harus divalidasi, upload file harus memiliki batas ukuran dan MIME type, dan URL file harus memiliki access policy yang sesuai. Data lokasi cuaca harus dapat diubah atau dimatikan pengguna.

## 10. Testing Strategy

Unit test diperlukan untuk filtering aplikasi, mapping status resource, dan transformasi adapter. Integration test diperlukan untuk upload file, retry, dan refresh data. Visual verification dilakukan pada desktop dan mobile. Regression checklist mencakup route `/`, sidebar drawer, notification popover, search, focus mode, dan toast.
