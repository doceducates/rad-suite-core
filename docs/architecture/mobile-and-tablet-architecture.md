# Mobile & Tablet Diagnostic Architecture (Android & iOS)

## 1. Executive Summary & Philosophy
Rad Suite's mobile strategy is designed for **clinical radiologists and referrers** demanding instant, zero-compromise diagnostic imaging on Android tablets (Samsung Galaxy Tab S8/S9/S10 Ultra, Lenovo Tab P series) and smartphones.

Rather than fragmenting the workstation into separate Flutter or React Native codebases that require rewriting complex DICOM shaders, we utilize **Tauri 2.0 Mobile** (`Rust + Android NDK + Universal Shell-Agnostic Web Core`).

```mermaid
flowchart TD
    subgraph Android OS [Android 10+ Tablet / Phone]
        Activity[MainActivity.kt / JNI Host]
        RustCore["Rust Native Core (aarch64-linux-android)"]
        HW_GPU["Android System WebView (Vulkan / OpenGL ES 3.0)"]
    end

    subgraph Rad Suite Engine [Universal Clinical Web Core]
        WebGL["MPR & 3D VRT Engine (Vitrea WebGL2 / WebGPU)"]
        Atlas["Anatomy Atlas & 3D Region Dock"]
        Editor["Structured TipTap & Draft Vault"]
        Touch["Multi-Touch & S-Pen Gestures (120Hz)"]
    end

    Activity --> RustCore
    RustCore --> HW_GPU
    HW_GPU --> WebGL
    HW_GPU --> Atlas
    HW_GPU --> Editor
    HW_GPU --> Touch
```

---

## 2. Framework Comparison: Why Tauri 2 Mobile Beats Alternatives

| Criteria | React Native | Flutter (Impeller) | Tauri 2.0 Mobile (Rad Suite) |
| :--- | :--- | :--- | :--- |
| **Idle RAM Footprint** | 140–200 MB | 90–140 MB | **35–50 MB** (Leaves 95% RAM for DICOM) |
| **MPR / 3D VRT Shaders** | Needs custom bridge | Must rewrite in Dart | **100% Shared GLSL / WebGPU shaders** |
| **Cold Start Time** | 2.4s – 3.8s | 1.2s – 2.0s | **< 800ms** |
| **APK Release Size** | ~45–70 MB | ~30–50 MB | **~15–25 MB** |
| **S-Pen & Stylus** | Latency via bridge | Custom touch engine | **Direct hardware PointerEvent (120Hz)** |
| **Code Duplication** | High (~60% rewrite) | Complete (100% rewrite)| **Zero (100% Shared UI & Logic)** |

---

## 3. High-Performance Tablet UX Invariants
1. **120Hz S-Pen & Precision Measurement**:
   - Caliper, ruler, and Cobb angle annotations read native `PointerEvent.pressure`, `tiltX`, and `tiltY`.
   - Snap-to-edge calculation runs in patient voxel space coordinates `(x, y, z)`.
2. **Cine Drag-to-Scrub Navigation**:
   - Single-finger vertical scrub (~12px per slice step) with inertial fling.
   - Two-finger pinch-to-zoom and two-finger pan.
3. **Responsive Clinical Drawer System**:
   - On screens $\le 1024\text{px}$, sidebars convert to hardware-accelerated slide-over sheets (`z-50`), preserving 100% of viewport width for diagnostic evaluation.
4. **Offline Diagnostic Vault**:
   - SQLite cache compiled directly into the application; studies downloaded via Wi-Fi remain accessible in shielded reading rooms without internet.

---

## 4. Android Build Prerequisites & Toolchain Setup

### A. System Environment Variables
```powershell
# Set Java 21 (installed on workstation)
$env:JAVA_HOME = "D:\Softwares\Installed\Java-21"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path

# Set Android SDK & NDK paths
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NDK_HOME = "$env:ANDROID_HOME\ndk\26.3.11579264"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;" + $env:Path
```

### B. Rust Android Architecture Targets
Install the 64-bit and 32-bit compilation targets via rustup:
```bash
rustup target add aarch64-linux-android   # Modern 64-bit ARM tablets & phones
rustup target add armv7-linux-androideabi # 32-bit ARM legacy devices
rustup target add x86_64-linux-android    # Android Studio x86_64 Emulator
```

---

## 5. Development & Packaging Workflow

### 1. Initialize Android Scaffolding (One-Time)
```bash
cd rad-suite-core
npx tauri android init --ci
```
Generates `src-tauri/gen/android` with Gradle build files and Android manifest.

### 2. Live Device Hot-Reload (Tablet / USB / Wi-Fi ADB)
Connect tablet with USB debugging enabled, then run:
```bash
npx tauri android dev
```

### 3. Production Release APK / AAB Generation
```bash
# Generate release APK for sideloading onto hospital tablets
npx tauri android build --apk

# Output APK path:
# src-tauri/gen/android/app/build/outputs/apk/release/app-release-unsigned.apk
```
