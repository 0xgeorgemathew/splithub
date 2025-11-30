"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AddExpenseForm } from "~~/components/expense/AddExpenseForm";

export default function AddExpensePage() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-base-200 pt-20 pb-32">
      {/* Header */}
      <div className="w-full max-w-md mx-auto px-6 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-base-100 hover:bg-base-300 flex items-center justify-center transition-colors shadow-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-base-content" />
          </button>
          <h1 className="text-2xl font-semibold text-base-content">Add Expense</h1>
        </div>
      </div>

      {/* Form */}
      <AddExpenseForm />
    </div>
  );
}
