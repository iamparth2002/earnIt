"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { Plus, Minus, Check, Dumbbell, Brain, Sparkles, Users, Palette, Repeat, ListTodo, Pencil, Archive, X, Loader2 } from "lucide-react";
import { Task } from "@/store/useStore";
import Image from "next/image";
import { toast } from "sonner";

// Categories
const CATEGORIES = [
  { id: "physical", label: "Physical", icon: Dumbbell, color: "bg-green-500" },
  { id: "mental", label: "Mental", icon: Brain, color: "bg-blue-500" },
  { id: "spiritual", label: "Spiritual", icon: Sparkles, color: "bg-purple-500" },
  { id: "social", label: "Social", icon: Users, color: "bg-orange-500" },
  { id: "creative", label: "Creative", icon: Palette, color: "bg-pink-500" },
] as const;

type CategoryType = typeof CATEGORIES[number]["id"];
type TaskType = "habit" | "daily" | "todo" | "reward";

// Mobile tab configuration (Rewards is accessed separately via bottom nav)
const MOBILE_TABS = [
  { id: "habits", label: "Habits", icon: Repeat },
  { id: "dailies", label: "Dailies", icon: Dumbbell },
  { id: "todos", label: "To Do's", icon: ListTodo },
] as const;

type MobileTab = typeof MOBILE_TABS[number]["id"];

export default function Dashboard() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  // Check if we're in the separate Rewards view (from bottom nav)
  const isRewardsView = tabFromUrl === "rewards";

  // All data from store (single source of truth)
  const stats = useStore((state) => state.stats);
  // Use getActiveRewards to filter out archived rewards for dashboard
  const rewards = useStore((state) => state.getActiveRewards());

  // Derived from single tasks array (already filters out archived)
  const habits = useStore((state) => state.getHabits());
  const dailies = useStore((state) => state.getDailies());
  const todos = useStore((state) => state.getTodos());

  // Store actions - simplified
  const addTask = useStore((state) => state.addTask);
  const updateTask = useStore((state) => state.updateTask);
  const deleteTask = useStore((state) => state.deleteTask);
  const incrementTask = useStore((state) => state.incrementTask);
  const decrementTask = useStore((state) => state.decrementTask);
  const toggleTask = useStore((state) => state.toggleTask);
  const addReward = useStore((state) => state.addReward);
  const updateReward = useStore((state) => state.updateReward);
  const archiveReward = useStore((state) => state.archiveReward);
  const spendOnReward = useStore((state) => state.spendOnReward);

  // Local UI state only
  const [addingType, setAddingType] = useState<TaskType | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskReward, setNewTaskReward] = useState(10);
  const [newTaskCategory, setNewTaskCategory] = useState<CategoryType>("physical");
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardCost, setNewRewardCost] = useState(20);
  const [mobileTab, setMobileTab] = useState<MobileTab>("habits");

  // Edit task state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskReward, setEditTaskReward] = useState(10);
  const [editTaskCategory, setEditTaskCategory] = useState<CategoryType>("physical");

  // Edit reward state
  const [editingReward, setEditingReward] = useState<{ id: string; name: string; cost: number } | null>(null);
  const [editRewardName, setEditRewardName] = useState("");
  const [editRewardCost, setEditRewardCost] = useState(20);

  // Loading states for modals - track which action is in progress
  const [taskAction, setTaskAction] = useState<"saving" | "deleting" | null>(null);
  const [rewardAction, setRewardAction] = useState<"saving" | "deleting" | null>(null);

  // Sync mobile tab with URL param (only for non-rewards tabs)
  useEffect(() => {
    if (tabFromUrl && MOBILE_TABS.some(t => t.id === tabFromUrl)) {
      setMobileTab(tabFromUrl as MobileTab);
    }
  }, [tabFromUrl]);

  const handleIncrementHabit = (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (habit) {
      incrementTask(id);
      toast.success(
        <div className="flex items-center gap-2">
          <Image src="/diamond.svg" alt="diamond" width={16} height={16} />
          <span>Earned +{habit.reward}</span>
        </div>,
        {
          action: {
            label: "Undo",
            onClick: () => decrementTask(id),
          },
        }
      );
    }
  };

  const handleDecrementHabit = (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (habit && habit.count > 0) {
      decrementTask(id);
      toast.error(
        <div className="flex items-center gap-2">
          <Image src="/diamond.svg" alt="diamond" width={16} height={16} />
          <span>Removed -{habit.reward}</span>
        </div>,
        {
          action: {
            label: "Undo",
            onClick: () => incrementTask(id),
          },
        }
      );
    }
  };

  const handleToggleDaily = (id: string) => {
    const daily = dailies.find(d => d.id === id);
    if (daily) {
      toggleTask(id);
      if (!daily.completed) {
        toast.success(
          <div className="flex items-center gap-2">
            <Image src="/diamond.svg" alt="diamond" width={16} height={16} />
            <span>Earned +{daily.reward}</span>
          </div>,
          {
            action: {
              label: "Undo",
              onClick: () => toggleTask(id),
            },
          }
        );
      } else {
        toast.error(
          <div className="flex items-center gap-2">
            <Image src="/diamond.svg" alt="diamond" width={16} height={16} />
            <span>Removed -{daily.reward}</span>
          </div>,
          {
            action: {
              label: "Undo",
              onClick: () => toggleTask(id),
            },
          }
        );
      }
    }
  };

  const handleToggleTodo = (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      toggleTask(id);
      if (!todo.completed) {
        toast.success(
          <div className="flex items-center gap-2">
            <Image src="/diamond.svg" alt="diamond" width={16} height={16} />
            <span>Earned +{todo.reward}</span>
          </div>,
          {
            action: {
              label: "Undo",
              onClick: () => toggleTask(id),
            },
          }
        );
      } else {
        toast.error(
          <div className="flex items-center gap-2">
            <Image src="/diamond.svg" alt="diamond" width={16} height={16} />
            <span>Removed -{todo.reward}</span>
          </div>,
          {
            action: {
              label: "Undo",
              onClick: () => toggleTask(id),
            },
          }
        );
      }
    }
  };

  const handleAddTask = () => {
    if (!addingType) return;

    // Validate title
    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle) {
      toast.error("Please enter a title");
      return;
    }
    if (trimmedTitle.length > 100) {
      toast.error("Title is too long (max 100 characters)");
      return;
    }

    // Validate reward
    const reward = Number(newTaskReward);
    if (isNaN(reward) || reward < 1) {
      toast.error("Reward must be at least 1");
      return;
    }
    if (reward > 1000) {
      toast.error("Reward cannot exceed 1,000");
      return;
    }

    addTask({
      title: trimmedTitle,
      category: newTaskCategory,
      reward: Math.floor(reward),
      type: addingType as "habit" | "daily" | "todo",
    });

    setNewTaskTitle("");
    setNewTaskReward(10);
    setNewTaskCategory("physical");
    setAddingType(null);
    toast.success(`${addingType.charAt(0).toUpperCase() + addingType.slice(1)} created!`);
  };

  const handleAddReward = () => {
    // Validate name
    const trimmedName = newRewardName.trim();
    if (!trimmedName) {
      toast.error("Please enter a reward name");
      return;
    }
    if (trimmedName.length > 50) {
      toast.error("Reward name is too long (max 50 characters)");
      return;
    }

    // Validate cost
    const cost = Number(newRewardCost);
    if (isNaN(cost) || cost < 1) {
      toast.error("Cost must be at least 1");
      return;
    }
    if (cost > 10000) {
      toast.error("Cost cannot exceed 10,000");
      return;
    }

    addReward({
      name: trimmedName,
      icon: "Gift",
      cost: Math.floor(cost),
    });
    setNewRewardName("");
    setNewRewardCost(20);
    setAddingType(null);
    toast.success(`Reward "${trimmedName}" created!`);
  };

  // Open edit task modal
  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskReward(task.reward);
    setEditTaskCategory(task.category as CategoryType);
  };

  // Handle edit task save
  const handleEditTask = async () => {
    if (!editingTask || taskAction) return;

    const trimmedTitle = editTaskTitle.trim();
    if (!trimmedTitle) {
      toast.error("Please enter a title");
      return;
    }

    const reward = Number(editTaskReward);
    if (isNaN(reward) || reward < 1) {
      toast.error("Reward must be at least 1");
      return;
    }

    setTaskAction("saving");
    const success = await updateTask(editingTask.id, {
      title: trimmedTitle,
      category: editTaskCategory,
      reward: Math.floor(reward),
    });
    setTaskAction(null);

    if (success) {
      toast.success("Task updated!");
      setEditingTask(null);
    } else {
      toast.error("Failed to update task");
    }
  };

  // Handle archive task
  const handleDeleteTask = async () => {
    if (!editingTask || taskAction) return;

    setTaskAction("deleting");
    await deleteTask(editingTask.id);
    setTaskAction(null);
    toast.success("Task deleted!");
    setEditingTask(null);
  };

  // Open edit reward modal
  const openEditReward = (reward: { id: string; name: string; cost: number }) => {
    setEditingReward(reward);
    setEditRewardName(reward.name);
    setEditRewardCost(reward.cost);
  };

  // Handle edit reward save
  const handleEditReward = async () => {
    if (!editingReward || rewardAction) return;

    const trimmedName = editRewardName.trim();
    if (!trimmedName) {
      toast.error("Please enter a name");
      return;
    }

    const cost = Number(editRewardCost);
    if (isNaN(cost) || cost < 1) {
      toast.error("Cost must be at least 1");
      return;
    }

    setRewardAction("saving");
    const success = await updateReward(editingReward.id, {
      name: trimmedName,
      cost: Math.floor(cost),
    });
    setRewardAction(null);

    if (success) {
      toast.success("Reward updated!");
      setEditingReward(null);
    } else {
      toast.error("Failed to update reward");
    }
  };

  // Handle archive reward
  const handleArchiveReward = async () => {
    if (!editingReward || rewardAction) return;

    setRewardAction("deleting");
    const success = await archiveReward(editingReward.id);
    setRewardAction(null);

    if (success) {
      toast.success("Reward deleted!");
      setEditingReward(null);
    } else {
      toast.error("Failed to delete reward");
    }
  };

  // Checkbox component
  const Checkbox = ({ checked, onClick }: { checked: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
        checked
          ? "bg-[#432874] border-[#432874]"
          : "border-[#432874]/50 hover:border-[#432874]"
      )}
    >
      {checked && <Check className="w-3 h-3 text-white" />}
    </button>
  );

  // Task Item component (simple: checkbox, title, gem chip)
  const TaskItem = ({ task, completed, onToggle, onEdit, isLast }: {
    task: Task;
    completed: boolean;
    onToggle: () => void;
    onEdit: () => void;
    isLast?: boolean;
  }) => {
    return (
      <div className={cn(
        "flex items-center gap-3 py-2.5 px-1",
        !isLast && "border-b border-gray-100"
      )}>
        <Checkbox checked={completed} onClick={onToggle} />
        <button
          onClick={onEdit}
          className={cn(
            "flex-1 text-sm text-left hover:text-[#432874] transition-colors",
            completed ? "text-gray-400 line-through" : "text-gray-700"
          )}
        >
          {task.title}
        </button>
        <span className="text-xs text-[#432874] font-medium flex items-center gap-1">
          <Image src="/diamond.svg" alt="diamond" width={14} height={14} />
          {task.reward}
        </span>
      </div>
    );
  };

  // Habit Item component (with +/- counter)
  const HabitItem = ({ habit, count, onIncrement, onDecrement, onEdit }: {
    habit: Task;
    count: number;
    onIncrement: () => void;
    onDecrement: () => void;
    onEdit: () => void;
  }) => {
    return (
      <div className="flex items-stretch mb-2 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Minus button - left side */}
        <button
          onClick={onDecrement}
          disabled={count === 0}
          className={cn(
            "w-12 flex items-center justify-center transition-all",
            count > 0
              ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
              : "bg-gray-50 text-gray-300 cursor-not-allowed"
          )}
        >
          <Minus className="w-5 h-5" />
        </button>

        {/* Content - middle */}
        <div className="flex-1 bg-white py-4 px-4 flex flex-col justify-between min-h-[60px]">
          <button
            onClick={onEdit}
            className="text-sm font-medium text-gray-800 text-left hover:text-[#432874] transition-colors"
          >
            {habit.title}
          </button>
          <div className="flex justify-end">
            <span className="text-xs text-[#432874] font-semibold flex items-center gap-1">
              <Image src="/diamond.svg" alt="diamond" width={14} height={14} />
              {habit.reward}
            </span>
          </div>
        </div>

        {/* Plus button - right side */}
        <button
          onClick={onIncrement}
          className="w-12 flex items-center justify-center gap-0.5 bg-[#432874] hover:bg-[#5a3a8a] text-white transition-all"
        >
          <Plus className="w-4 h-4" />
          {count > 0 && <span className="text-sm font-bold">{count}</span>}
        </button>
      </div>
    );
  };

  // Mobile Rewards View - separate panel without tab bar
  if (isRewardsView) {
    return (
      <div className="h-[calc(100dvh-56px-64px)] md:h-[calc(100dvh-56px)] bg-gray-100 p-2 sm:p-4 overflow-hidden flex flex-col">
        {/* Add Reward Modal */}
        <AnimatePresence>
          {addingType === "reward" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
              onClick={() => setAddingType(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
              >
                <h3 className="text-lg font-bold text-gray-800 mb-5">
                  Add New Reward
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">Name</label>
                    <Input
                      placeholder="Enter reward name..."
                      value={newRewardName}
                      onChange={(e) => setNewRewardName(e.target.value.slice(0, 50))}
                      maxLength={50}
                      autoFocus
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block text-right">{newRewardName.length}/50</span>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">Cost</label>
                    <div className="flex items-center gap-2">
                      <Image src="/diamond.svg" alt="diamond" width={20} height={20} />
                      <Input
                        type="number"
                        value={newRewardCost}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Math.max(0, Math.min(10000, parseInt(e.target.value) || 0));
                          setNewRewardCost(val);
                        }}
                        min={1}
                        max={10000}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-3">
                    <Button variant="outline" onClick={() => setAddingType(null)} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddReward}
                      disabled={!newRewardName.trim() || newRewardCost < 1}
                      className="flex-1 bg-[#432874] hover:bg-[#5a3a8a] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Reward Modal - Mobile */}
        <AnimatePresence>
          {editingReward && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
              onClick={() => setEditingReward(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[85vh] overflow-y-auto relative"
              >
                <button
                  onClick={() => setEditingReward(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold text-gray-800 mb-5">
                  Edit Reward
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">Name</label>
                    <Input
                      placeholder="Enter reward name..."
                      value={editRewardName}
                      onChange={(e) => setEditRewardName(e.target.value.slice(0, 50))}
                      maxLength={50}
                      autoFocus
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block text-right">{editRewardName.length}/50</span>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">Cost</label>
                    <div className="flex items-center gap-2">
                      <Image src="/diamond.svg" alt="diamond" width={20} height={20} />
                      <Input
                        type="number"
                        value={editRewardCost}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Math.max(0, Math.min(10000, parseInt(e.target.value) || 0));
                          setEditRewardCost(val);
                        }}
                        min={1}
                        max={10000}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-3">
                    <Button
                      variant="outline"
                      onClick={handleArchiveReward}
                      disabled={!!rewardAction}
                      className="flex-1 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                      title="Delete reward"
                    >
                      {rewardAction === "deleting" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                      Delete
                    </Button>
                    <Button
                      onClick={handleEditReward}
                      disabled={!editRewardName.trim() || editRewardCost < 1 || !!rewardAction}
                      className="flex-1 bg-[#432874] hover:bg-[#5a3a8a] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rewardAction === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rewards Panel - Full width on mobile */}
        <div className="bg-white rounded-xl shadow-sm flex flex-col overflow-hidden flex-1">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-lg">Rewards</h2>
            <button
              onClick={() => setAddingType("reward")}
              className="text-[#432874] hover:bg-[#432874]/10 p-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3">
            {rewards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <p className="text-gray-500 text-sm mb-1">Treats you can buy with gems</p>
                <p className="text-gray-400 text-xs mb-4">Motivate yourself with things you enjoy</p>
                <button
                  onClick={() => setAddingType("reward")}
                  className="text-[#432874] text-sm font-medium hover:underline"
                >
                  + Add reward
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {rewards.map((reward) => {
                  const canAfford = stats.balance >= reward.cost;
                  return (
                    <div
                      key={reward.id}
                      className={cn(
                        "h-28 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all border relative",
                        canAfford
                          ? "bg-white border-gray-200 hover:border-[#432874] hover:shadow-md"
                          : "bg-gray-50 border-gray-200 opacity-50"
                      )}
                    >
                      {/* Edit button - always visible on mobile */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditReward(reward);
                        }}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white border border-gray-200 hover:bg-[#432874] hover:text-white hover:border-[#432874] text-gray-500 transition-all shadow-sm"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (canAfford) {
                            spendOnReward(reward.id);
                            toast.error(
                              <div className="flex items-center gap-2">
                                <Image src="/diamond.svg" alt="diamond" width={16} height={16} />
                                <span>Spent -{reward.cost} on {reward.name}</span>
                              </div>
                            );
                          }
                        }}
                        disabled={!canAfford}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 w-full",
                          !canAfford && "cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <Image src="/diamond.svg" alt="diamond" width={24} height={24} />
                          <span className={cn(
                            "text-xl font-bold",
                            canAfford ? "text-[#432874]" : "text-gray-400"
                          )}>
                            {reward.cost}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-600 text-center line-clamp-2 leading-tight">{reward.name}</p>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-56px-64px)] md:h-[calc(100dvh-56px)] bg-gray-100 p-2 sm:p-4 overflow-hidden flex flex-col">
      {/* Mobile Tab Bar - for switching between columns (not shown when in Rewards view) */}
      <div className="md:hidden flex bg-white rounded-xl shadow-sm mb-2 p-1 flex-shrink-0">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = mobileTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all",
                isActive
                  ? "bg-[#432874] text-white"
                  : "text-gray-500 hover:bg-gray-100"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editingTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={() => setEditingTask(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[85vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setEditingTask(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-gray-800 mb-5 capitalize">
                Edit {editingTask.type}
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1.5 block">Title</label>
                  <Input
                    placeholder={`Enter ${editingTask.type} title...`}
                    value={editTaskTitle}
                    onChange={(e) => setEditTaskTitle(e.target.value.slice(0, 100))}
                    maxLength={100}
                    autoFocus
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block text-right">{editTaskTitle.length}/100</span>
                </div>

                {/* Category Selection - Circular */}
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-3 block">Category</label>
                  <div className="flex justify-between px-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = editTaskCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setEditTaskCategory(cat.id)}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-[#432874] ring-2 ring-[#432874] ring-offset-2"
                              : "bg-gray-100 hover:bg-gray-200"
                          )}>
                            <Icon className={cn(
                              "w-5 h-5",
                              isSelected ? "text-white" : "text-gray-500"
                            )} />
                          </div>
                          <span className={cn(
                            "text-[10px] font-medium",
                            isSelected ? "text-[#432874]" : "text-gray-500"
                          )}>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1.5 block">Reward</label>
                  <div className="flex items-center gap-2">
                    <Image src="/diamond.svg" alt="diamond" width={20} height={20} />
                    <Input
                      type="number"
                      value={editTaskReward}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Math.min(1000, parseInt(e.target.value) || 0));
                        setEditTaskReward(val);
                      }}
                      min={1}
                      max={1000}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-3">
                  <Button
                    variant="outline"
                    onClick={handleDeleteTask}
                    disabled={!!taskAction}
                    className="flex-1 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  >
                    {taskAction === "deleting" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                    Delete
                  </Button>
                  <Button
                    onClick={handleEditTask}
                    disabled={!editTaskTitle.trim() || editTaskReward < 1 || !!taskAction}
                    className="flex-1 bg-[#432874] hover:bg-[#5a3a8a] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {taskAction === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Reward Modal */}
      <AnimatePresence>
        {editingReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={() => setEditingReward(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[85vh] overflow-y-auto relative"
            >
              <button
                onClick={() => setEditingReward(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-gray-800 mb-5">
                Edit Reward
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1.5 block">Name</label>
                  <Input
                    placeholder="Enter reward name..."
                    value={editRewardName}
                    onChange={(e) => setEditRewardName(e.target.value.slice(0, 50))}
                    maxLength={50}
                    autoFocus
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block text-right">{editRewardName.length}/50</span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1.5 block">Cost</label>
                  <div className="flex items-center gap-2">
                    <Image src="/diamond.svg" alt="diamond" width={20} height={20} />
                    <Input
                      type="number"
                      value={editRewardCost}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Math.min(10000, parseInt(e.target.value) || 0));
                        setEditRewardCost(val);
                      }}
                      min={1}
                      max={10000}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-3">
                  <Button
                    variant="outline"
                    onClick={handleArchiveReward}
                    disabled={!!rewardAction}
                    className="flex-1 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                    title="Delete reward"
                  >
                    {rewardAction === "deleting" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                    Delete
                  </Button>
                  <Button
                    onClick={handleEditReward}
                    disabled={!editRewardName.trim() || editRewardCost < 1 || !!rewardAction}
                    className="flex-1 bg-[#432874] hover:bg-[#5a3a8a] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {rewardAction === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {addingType && addingType !== "reward" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={() => setAddingType(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-gray-800 mb-5 capitalize">
                Add New {addingType}
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1.5 block">Title</label>
                  <Input
                    placeholder={`Enter ${addingType} title...`}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value.slice(0, 100))}
                    maxLength={100}
                    autoFocus
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block text-right">{newTaskTitle.length}/100</span>
                </div>

                {/* Category Selection - Circular */}
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-3 block">Category</label>
                  <div className="flex justify-between px-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = newTaskCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setNewTaskCategory(cat.id)}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-[#432874] ring-2 ring-[#432874] ring-offset-2"
                              : "bg-gray-100 hover:bg-gray-200"
                          )}>
                            <Icon className={cn(
                              "w-5 h-5",
                              isSelected ? "text-white" : "text-gray-500"
                            )} />
                          </div>
                          <span className={cn(
                            "text-[10px] font-medium",
                            isSelected ? "text-[#432874]" : "text-gray-500"
                          )}>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1.5 block">Reward</label>
                  <div className="flex items-center gap-2">
                    <Image src="/diamond.svg" alt="diamond" width={20} height={20} />
                    <Input
                      type="number"
                      value={newTaskReward}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Math.min(1000, parseInt(e.target.value) || 0));
                        setNewTaskReward(val);
                      }}
                      min={1}
                      max={1000}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-3">
                  <Button variant="outline" onClick={() => setAddingType(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddTask}
                    disabled={!newTaskTitle.trim() || newTaskReward < 1}
                    className="flex-1 bg-[#432874] hover:bg-[#5a3a8a] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Add Reward Modal */}
        {addingType === "reward" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={() => setAddingType(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-gray-800 mb-5">
                Add New Reward
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1.5 block">Name</label>
                  <Input
                    placeholder="Enter reward name..."
                    value={newRewardName}
                    onChange={(e) => setNewRewardName(e.target.value.slice(0, 50))}
                    maxLength={50}
                    autoFocus
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block text-right">{newRewardName.length}/50</span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1.5 block">Cost</label>
                  <div className="flex items-center gap-2">
                    <Image src="/diamond.svg" alt="diamond" width={20} height={20} />
                    <Input
                      type="number"
                      value={newRewardCost}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Math.min(10000, parseInt(e.target.value) || 0));
                        setNewRewardCost(val);
                      }}
                      min={1}
                      max={10000}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-3">
                  <Button variant="outline" onClick={() => setAddingType(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddReward}
                    disabled={!newRewardName.trim() || newRewardCost < 1}
                    className="flex-1 bg-[#432874] hover:bg-[#5a3a8a] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4 Columns - Desktop: grid, Mobile: single column based on tab */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 sm:gap-4 flex-1 min-h-0">
        {/* Habits Column */}
        <div className={cn(
          "bg-white rounded-xl shadow-sm flex flex-col overflow-hidden",
          mobileTab !== "habits" && "hidden md:flex"
        )}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Habits</h2>
            <button
              onClick={() => setAddingType("habit")}
              className="text-[#432874] hover:bg-[#432874]/10 p-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3">
            {habits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <p className="text-gray-500 text-sm mb-1">Positive or negative behaviors to track daily</p>
                <p className="text-gray-400 text-xs mb-4">Complete them to earn gems</p>
                <button
                  onClick={() => setAddingType("habit")}
                  className="text-[#432874] text-sm font-medium hover:underline"
                >
                  + Add habit
                </button>
              </div>
            ) : (
              habits.map((habit) => (
                <HabitItem
                  key={habit.id}
                  habit={habit}
                  count={habit.count}
                  onIncrement={() => handleIncrementHabit(habit.id)}
                  onDecrement={() => handleDecrementHabit(habit.id)}
                  onEdit={() => openEditTask(habit)}
                />
              ))
            )}
          </div>
        </div>

        {/* Dailies Column */}
        <div className={cn(
          "bg-white rounded-xl shadow-sm flex flex-col overflow-hidden",
          mobileTab !== "dailies" && "hidden md:flex"
        )}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Dailies</h2>
            <button
              onClick={() => setAddingType("daily")}
              className="text-[#432874] hover:bg-[#432874]/10 p-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3">
            {dailies.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <p className="text-gray-500 text-sm mb-1">Tasks that reset every day</p>
                <p className="text-gray-400 text-xs mb-4">Build streaks by completing them consistently</p>
                <button
                  onClick={() => setAddingType("daily")}
                  className="text-[#432874] text-sm font-medium hover:underline"
                >
                  + Add daily
                </button>
              </div>
            ) : (
              dailies.map((daily, index) => (
                <TaskItem
                  key={daily.id}
                  task={daily}
                  completed={daily.completed}
                  onToggle={() => handleToggleDaily(daily.id)}
                  onEdit={() => openEditTask(daily)}
                  isLast={index === dailies.length - 1}
                />
              ))
            )}
          </div>
        </div>

        {/* To Do's Column */}
        <div className={cn(
          "bg-white rounded-xl shadow-sm flex flex-col overflow-hidden",
          mobileTab !== "todos" && "hidden md:flex"
        )}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">To Do&apos;s</h2>
            <button
              onClick={() => setAddingType("todo")}
              className="text-[#432874] hover:bg-[#432874]/10 p-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3">
            {todos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <p className="text-gray-500 text-sm mb-1">One-time tasks to complete</p>
                <p className="text-gray-400 text-xs mb-4">Check them off and earn gems</p>
                <button
                  onClick={() => setAddingType("todo")}
                  className="text-[#432874] text-sm font-medium hover:underline"
                >
                  + Add to-do
                </button>
              </div>
            ) : (
              todos.map((todo, index) => (
                <TaskItem
                  key={todo.id}
                  task={todo}
                  completed={todo.completed}
                  onToggle={() => handleToggleTodo(todo.id)}
                  onEdit={() => openEditTask(todo)}
                  isLast={index === todos.length - 1}
                />
              ))
            )}
          </div>
        </div>

        {/* Rewards Column - Desktop only (mobile has separate view) */}
        <div className="bg-white rounded-xl shadow-sm flex-col overflow-hidden hidden md:flex">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Rewards</h2>
            <button
              onClick={() => setAddingType("reward")}
              className="text-[#432874] hover:bg-[#432874]/10 p-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Rewards Grid */}
          <div className="flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3">
            {rewards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <p className="text-gray-500 text-sm mb-1">Treats you can buy with gems</p>
                <p className="text-gray-400 text-xs mb-4">Motivate yourself with things you enjoy</p>
                <button
                  onClick={() => setAddingType("reward")}
                  className="text-[#432874] text-sm font-medium hover:underline"
                >
                  + Add reward
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 auto-rows-min">
                {rewards.map((reward) => {
                  const canAfford = stats.balance >= reward.cost;
                  return (
                    <div
                      key={reward.id}
                      className={cn(
                        "h-24 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all border relative group",
                        canAfford
                          ? "bg-white border-gray-200 hover:border-[#432874] hover:shadow-md"
                          : "bg-gray-50 border-gray-200 opacity-50"
                      )}
                    >
                      {/* Edit button on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditReward(reward);
                        }}
                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white border border-gray-200 hover:bg-[#432874] hover:text-white hover:border-[#432874] text-gray-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (canAfford) {
                            spendOnReward(reward.id);
                            toast.error(
                              <div className="flex items-center gap-2">
                                <Image src="/diamond.svg" alt="diamond" width={16} height={16} />
                                <span>Spent -{reward.cost} on {reward.name}</span>
                              </div>
                            );
                          }
                        }}
                        disabled={!canAfford}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 w-full",
                          !canAfford && "cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <Image src="/diamond.svg" alt="diamond" width={20} height={20} />
                          <span className={cn(
                            "text-lg font-bold",
                            canAfford ? "text-[#432874]" : "text-gray-400"
                          )}>
                            {reward.cost}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-600 text-center line-clamp-2 leading-tight">{reward.name}</p>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
