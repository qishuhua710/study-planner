"use client";

/**
 * Tasks 数据 hook（基于 Supabase）
 *
 * - 自动监听 user 变化：切换账号自动重新加载
 * - useQuery 缓存 30 秒
 * - mutations: addTask / updateTask / removeTask / updateStatusBulk / removeBulk
 */

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import {
  loadTasks,
  insertTask,
  updateTaskRow,
  deleteTaskRow,
  updateTaskStatusBulk,
  deleteTasksBulk,
  generateTaskId,
  type Task,
  type Status,
} from "@/lib/tasks-cloud";

const TASKS_QUERY_KEY = ["tasks"] as const;

/** 获取当前用户的任务列表（自动按 user 隔离） */
export function useTasks() {
  const { user, loading } = useCurrentUser();
  const query = useQuery({
    queryKey: [...TASKS_QUERY_KEY, user?.id ?? "anonymous"],
    queryFn: async () => {
      if (!user) return [];
      return loadTasks();
    },
    enabled: !!user && !loading,
    staleTime: 30 * 1000,
  });

  return {
    tasks: query.data ?? [],
    loading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useTaskMutations() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: TASKS_QUERY_KEY });

  const addTaskMutation = useMutation({
    mutationFn: async (
      input: Omit<Task, "id" | "createdAt" | "updatedAt">,
    ) => {
      if (!user) throw new Error("未登录");
      const id = generateTaskId();
      return insertTask(user.id, { ...input, id });
    },
    onSuccess: invalidate,
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Task>;
    }) => {
      if (!user) throw new Error("未登录");
      return updateTaskRow(user.id, id, updates);
    },
    onSuccess: invalidate,
  });

  const removeTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("未登录");
      return deleteTaskRow(user.id, id);
    },
    onSuccess: invalidate,
  });

  const updateStatusBulkMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: Status;
    }) => {
      if (!user) throw new Error("未登录");
      return updateTaskStatusBulk(user.id, ids, status);
    },
    onSuccess: invalidate,
  });

  const removeBulkMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user) throw new Error("未登录");
      return deleteTasksBulk(user.id, ids);
    },
    onSuccess: invalidate,
  });

  return {
    addTask: addTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    removeTask: removeTaskMutation.mutateAsync,
    updateStatusBulk: updateStatusBulkMutation.mutateAsync,
    removeBulk: removeBulkMutation.mutateAsync,
    isPending:
      addTaskMutation.isPending ||
      updateTaskMutation.isPending ||
      removeTaskMutation.isPending,
  };
}

/** 简单的空列表 fallback hook（防止 SSR / hydration mismatch） */
export function useTasksSafe() {
  const { tasks, loading } = useTasks();
  return { tasks, loading };
}