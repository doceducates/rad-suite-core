use serde::{Deserialize, Serialize};
use std::fs;
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::Child;
use std::sync::Mutex;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

static SERVER_CHILD: Mutex<Option<Child>> = Mutex::new(None);
static SELECTED_PORT: Mutex<u16> = Mutex::new(3780);
static INTERNAL_NONCE: Mutex<String> = Mutex::new(String::new());

fn is_port_reachable(port: u16) -> bool {
    use std::net::SocketAddr;
    use std::time::Duration;
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    TcpStream::connect_timeout(&addr, Duration::from_millis(50)).is_ok()
}

fn find_available_port(preferred: u16, fallback_range: std::ops::RangeInclusive<u16>) -> u16 {
    // 1. If preferred port is free to bind, claim it
    if TcpListener::bind(("127.0.0.1", preferred)).is_ok() {
        return preferred;
    }
    // 2. If preferred port is already active (e.g. running dev server or Rad Suite instance), reuse it
    if is_port_reachable(preferred) {
        return preferred;
    }
    // 3. Search fallback range for first free loopback port
    for port in fallback_range {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return port;
        }
    }
    preferred
}

fn generate_nonce() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos();
    let pid = std::process::id();
    format!("{:016x}{:016x}", now, pid as u128)
}

#[derive(Serialize, Deserialize)]
pub struct SystemSpecs {
    pub cpu_cores: usize,
    pub os_name: String,
    pub arch: String,
    pub gpu_accelerated: bool,
}

#[tauri::command]
fn get_system_specs() -> SystemSpecs {
    let cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1);

    SystemSpecs {
        cpu_cores: cores,
        os_name: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        gpu_accelerated: true,
    }
}

#[tauri::command]
fn read_local_dicom_file(file_path: String) -> Result<Vec<u8>, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }
    fs::read(path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn check_backend_status() -> bool {
    let port = SELECTED_PORT.lock().map(|p| *p).unwrap_or(3780);
    is_port_reachable(port)
}

#[tauri::command]
fn get_backend_info() -> serde_json::Value {
    let port = SELECTED_PORT.lock().map(|p| *p).unwrap_or(3780);
    let nonce = INTERNAL_NONCE.lock().map(|n| n.clone()).unwrap_or_default();
    serde_json::json!({
        "port": port,
        "nonce": nonce
    })
}

#[tauri::command]
fn open_in_browser(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &url])
            .spawn()
            .map_err(|e| format!("Failed to open system browser: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open system browser: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Failed to open system browser: {}", e))?;
    }
    Ok(())
}

fn strip_unc_prefix(path: &Path) -> PathBuf {
    let s = path.to_string_lossy();
    if let Some(stripped) = s.strip_prefix(r"\\?\UNC\") {
        PathBuf::from(format!(r"\\{}", stripped))
    } else if let Some(stripped) = s.strip_prefix(r"\\?\") {
        PathBuf::from(stripped)
    } else {
        path.to_path_buf()
    }
}

fn find_file_in_candidates(candidates: &[PathBuf]) -> Option<PathBuf> {
    for c in candidates {
        let clean = strip_unc_prefix(c);
        if clean.exists() || c.exists() {
            return Some(clean);
        }
    }
    None
}

fn spawn_backend_server(app: &tauri::AppHandle) {
    let port = find_available_port(3780, 3781..=3795);
    if let Ok(mut p) = SELECTED_PORT.lock() {
        *p = port;
    }

    let nonce = generate_nonce();
    if let Ok(mut n) = INTERNAL_NONCE.lock() {
        *n = nonce.clone();
    }

    // If selected port is already active (e.g. dev server or running instance), reuse it
    if is_port_reachable(port) {
        log::info!("Rad Suite backend is already running on port {}.", port);
        return;
    }

    let resource_dir = app
        .path()
        .resource_dir()
        .map(|p| strip_unc_prefix(&p))
        .unwrap_or_else(|_| PathBuf::from("."));

    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| strip_unc_prefix(p)))
        .unwrap_or_else(|| PathBuf::from("."));

    // Check for bundled node.exe or fall back to system node
    let node_candidates = vec![
        resource_dir.join("standalone").join("node.exe"),
        resource_dir.join("node.exe"),
        exe_dir.join("standalone").join("node.exe"),
        exe_dir.join("node.exe"),
    ];

    let node_bin = find_file_in_candidates(&node_candidates)
        .map(|p| strip_unc_prefix(&p).to_string_lossy().to_string())
        .unwrap_or_else(|| "node".to_string());

    // Check for server.js in bundled or local locations
    let server_candidates = vec![
        resource_dir.join("standalone").join("server.js"),
        resource_dir.join("server.js"),
        exe_dir.join("standalone").join("server.js"),
        exe_dir.join("server.js"),
        PathBuf::from(".next").join("standalone").join("server.js"),
        PathBuf::from("..").join(".next").join("standalone").join("server.js"),
        PathBuf::from("server.js"),
    ];

    let Some(server_js) = find_file_in_candidates(&server_candidates) else {
        log::warn!("Could not locate standalone server.js. Assuming external dev server.");
        return;
    };

    let server_js = strip_unc_prefix(&server_js);
    let working_dir = server_js.parent().map(strip_unc_prefix).unwrap_or_else(|| PathBuf::from("."));

    log::info!(
        "Spawning background backend server on port {}: {} {} (cwd: {:?})",
        port,
        node_bin,
        server_js.display(),
        working_dir
    );

    let mut cmd = std::process::Command::new(&node_bin);
    cmd.arg(&server_js);
    cmd.current_dir(&working_dir);
    cmd.env("PORT", port.to_string());
    cmd.env("HOSTNAME", "127.0.0.1");
    cmd.env("NODE_ENV", "production");
    cmd.env("IS_DESKTOP", "1");
    cmd.env("RADSUITE_INTERNAL_NONCE", &nonce);

    // Redirect stdout and stderr to a log file for instant crash diagnostics
    if let Ok(log_file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(working_dir.join("backend_server.log"))
    {
        if let Ok(err_file) = log_file.try_clone() {
            cmd.stdout(log_file);
            cmd.stderr(err_file);
        }
    }

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW: zero black CMD popups

    match cmd.spawn() {
        Ok(child) => {
            log::info!("Backend server spawned successfully with PID {} on port {}", child.id(), port);
            if let Ok(mut lock) = SERVER_CHILD.lock() {
                *lock = Some(child);
            }
        }
        Err(err) => {
            log::error!("Failed to spawn local backend server on port {}: {}", port, err);
        }
    }
}

fn wait_for_backend_and_navigate(app: tauri::AppHandle) {
    let port = SELECTED_PORT.lock().map(|p| *p).unwrap_or(3780);
    let nonce = INTERNAL_NONCE.lock().map(|n| n.clone()).unwrap_or_default();
    let target = if nonce.is_empty() {
        format!("http://localhost:{}/desktop", port)
    } else {
        format!("http://localhost:{}/desktop?nonce={}", port, nonce)
    };

    for _ in 0..120 {
        std::thread::sleep(std::time::Duration::from_millis(200));
        if is_port_reachable(port) {
            log::info!("Rad Suite backend active on port {}! Navigating window...", port);
            if let Some(window) = app.get_webview_window("main") {
                let js = format!("window.location.replace('{}');", target);
                let _ = window.eval(&js);
            }
            return;
        }
    }
    log::error!("Rad Suite backend did not respond on port {} after 24 seconds.", port);
}

fn shutdown_hmis_gateway_if_running() {
    if is_port_reachable(3788) {
        use std::io::Write;
        use std::net::SocketAddr;
        use std::time::Duration;
        log::info!("Releasing HMIS portal session and shutting down HMIS gateway (port 3788)...");
        let addr = SocketAddr::from(([127, 0, 0, 1], 3788));
        if let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(500)) {
            let req = "POST /api/system/shutdown HTTP/1.1\r\nHost: 127.0.0.1:3788\r\nConnection: close\r\nContent-Length: 0\r\n\r\n";
            let _ = stream.write_all(req.as_bytes());
            let _ = stream.flush();
            std::thread::sleep(Duration::from_millis(800));
        }
    }
}

fn stop_backend_server() {
    shutdown_hmis_gateway_if_running();
    if let Ok(mut lock) = SERVER_CHILD.lock() {
        if let Some(mut child) = lock.take() {
            log::info!("Stopping background backend server (PID {})...", child.id());
            let _ = child.kill();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                #[cfg(not(mobile))]
                {
                    spawn_backend_server(&handle);
                    wait_for_backend_and_navigate(handle);
                }
                #[cfg(mobile)]
                {
                    let _ = &handle;
                    log::info!("Rad Suite Mobile initializing. Remote cloud gateway active.");
                }
            });
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                stop_backend_server();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_system_specs,
            read_local_dicom_file,
            open_in_browser,
            check_backend_status,
            get_backend_info
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            stop_backend_server();
        }
    });
}
