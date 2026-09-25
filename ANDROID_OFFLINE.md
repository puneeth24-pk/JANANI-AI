# JANANI: Android Offline Deployment & Build Guide

## 1. Target Hardware & Specifications

- **Device Profile**: Low-cost Android Educational Tablet
- **Minimum OS**: Android 9.0 Pie (API Level 28)
- **Target OS**: Android 14 (API Level 34)
- **System Memory**: ~2 GB Physical RAM
- **Network Dependency**: **0% (100% Offline operation post-sync)**

---

## 2. Key Android Manifest Configurations

Located in [`frontend/janani/android/app/src/main/AndroidManifest.xml`](file:///Users/puneeth/Downloads/SANTALI/frontend/janani/android/app/src/main/AndroidManifest.xml):

```xml
<application
    android:name=".MainApplication"
    android:label="JANANI"
    android:icon="@mipmap/ic_launcher"
    android:largeHeap="true"
    android:hardwareAccelerated="true"
    android:usesCleartextTraffic="true">
    
    <!-- Permissions required for voice classroom & local audio storage -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### Why `android:largeHeap="true"` is Critical
By default, low-memory Android devices limit each app's memory heap to 128 MB or 256 MB. Enabling `largeHeap="true"` allows foreground AI operations to expand up to the device maximum (typically 512 MB), preventing unexpected Out-Of-Memory crashes during speech recognition and synthesis.

---

## 3. Building the Release APK

### Prerequisites
1. Android SDK installed (API 28+ and Build-Tools 34.0.0 or 35.0.0).
2. OpenJDK 17 or later.

### Build Commands
```bash
# Navigate to Android directory
cd frontend/janani/android

# Clean previous build artifacts
./gradlew clean

# Build standalone offline release APK
./gradlew assembleRelease
```

The output APK will be located at:
```
frontend/janani/android/app/build/outputs/apk/release/app-release.apk
```

### Installing onto Connected Android Device or Emulator
```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

---

## 4. On-Device Storage & Asset Structure

```
/data/data/com.janani.app/
├── files/
│   ├── models/                  (Synchronized AI weights)
│   │   ├── indictrans2-int8/
│   │   └── DhVaani-0.5/
│   ├── lesson_audio/            (Locally synthesized WAVs)
│   └── database/
│       └── janani.db            (Local SQLite for history & worksheets)
└── cache/                       (Temporary recording buffers)
```

---

## 5. Memory & Battery Mitigation Rules

1. **Sequential Loading**: Never load Whisper, IndicTrans2, and DhVaani into RAM at the same instant.
2. **Audio Streaming**: Write audio directly to disk in 16 kHz mono chunks rather than accumulating unbounded float arrays in memory.
3. **No Background Services**: The app shuts down audio hardware as soon as speech recognition or playback finishes.
