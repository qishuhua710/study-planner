/**
 * 认证操作 API
 *
 * - signUp: 邮箱注册（自动发送验证邮件，supabase 默认配置）
 * - signIn: 邮箱登录
 * - signOut: 退出登录
 * - resetPassword: 发送找回密码邮件
 */

import { ensureSupabase } from "./supabase";

export interface AuthResult {
  ok: boolean;
  error?: string;
  message?: string;
}

/**
 * 邮箱注册
 * @supabaseInstance 默认会发验证邮件（需在 Supabase 控制台关闭"Confirm email"开关以免卡流程）
 */
export async function signUp(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const supabase = await ensureSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    // 如果 supabase 配置为"必须邮箱验证"，session 会是 null
    if (!data.session) {
      return {
        ok: true,
        message: "注册成功！请前往邮箱点击验证链接后再登录。",
      };
    }
    return { ok: true, message: "注册成功，正在进入..." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * 邮箱登录
 */
export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const supabase = await ensureSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, message: "登录成功" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * 退出登录
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const supabase = await ensureSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * 发送找回密码邮件
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    const supabase = await ensureSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, message: "找回密码邮件已发送，请检查邮箱" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * 更新密码
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  try {
    const supabase = await ensureSupabase();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, message: "密码已更新" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}