// 学习日程管理桌面版 — Tauri 主逻辑
// 功能：开机自启动、系统托盘、关窗缩托盘、桌面通知、全局快捷键

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_global_shortcut::ShortcutState;

// ==================== 自定义命令：开机自启动 ====================

/// 查询开机自启动是否已启用
#[tauri::command]
fn is_autostart_enabled(app: tauri::AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

/// 开启 / 关闭开机自启动，返回最终状态
#[tauri::command]
fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<bool, String> {
    let mgr = app.autolaunch();
    if enabled {
        mgr.enable().map_err(|e| e.to_string())?;
    } else {
        mgr.disable().map_err(|e| e.to_string())?;
    }
    Ok(enabled)
}

// ==================== 应用入口 ====================

pub fn run() {
    tauri::Builder::default()
        // 开机自启动插件（macOS 用 LaunchAgent 方式）
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        // 桌面通知插件
        .plugin(tauri_plugin_notification::init())
        // 全局快捷键：Cmd+Shift+S 显示/聚焦窗口
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["cmd+shift+s"])
                .expect("快捷键解析失败")
                .with_handler(move |app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(),
        )
        // 前端可调用的命令
        .invoke_handler(tauri::generate_handler![
            is_autostart_enabled,
            set_autostart,
        ])
        .setup(|app| {
            // ===== 系统托盘菜单 =====
            let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            TrayIconBuilder::with_id("main-tray")
                .menu(&menu)
                .tooltip("学习日程管理")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // 关闭窗口时缩到托盘，而非退出应用
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("Tauri 启动失败");
}
