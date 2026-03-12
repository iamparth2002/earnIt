"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const result = await signup(formData.name, formData.email, formData.password);
    if (result.success) {
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } else {
      setError(result.error || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-gradient-to-br from-[#432874] via-[#5a3a8a] to-[#432874] relative overflow-hidden">
      {/* Dot Pattern Background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Decorative Shapes */}
      <div className="absolute top-10 right-10 w-32 h-32 border border-white/10 rounded-full" />
      <div className="absolute top-20 right-20 w-48 h-48 border border-white/5 rounded-full" />
      <div className="absolute bottom-10 left-10 w-40 h-40 border border-white/10 rounded-full" />
      <div className="absolute bottom-20 left-20 w-56 h-56 border border-white/5 rounded-full" />
      <div className="absolute top-1/4 left-1/4 w-24 h-24 bg-white/5 rounded-2xl rotate-12" />
      <div className="absolute bottom-1/4 right-1/4 w-20 h-20 bg-white/5 rounded-2xl -rotate-12" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[420px] bg-white rounded-2xl shadow-2xl p-6 sm:p-8"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-[26px] font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">
            Start your journey to better habits today.
          </p>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter your Name"
              className="w-full h-11 px-4 rounded-lg border border-gray-200 focus:border-[#432874] focus:ring-2 focus:ring-[#432874]/20 outline-none transition-all text-sm"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your Email"
              className="w-full h-11 px-4 rounded-lg border border-gray-200 focus:border-[#432874] focus:ring-2 focus:ring-[#432874]/20 outline-none transition-all text-sm"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a Password"
                className="w-full h-11 px-4 pr-11 rounded-lg border border-gray-200 focus:border-[#432874] focus:ring-2 focus:ring-[#432874]/20 outline-none transition-all text-sm"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-[#432874] hover:bg-[#362060] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Sign up"
            )}
          </button>
        </form>

        {/* Sign In Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-[#432874] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
