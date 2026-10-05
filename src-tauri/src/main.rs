// 桌面端入口：关闭 Windows 控制台窗口（发布模式）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    study_planner_lib::run();
}
