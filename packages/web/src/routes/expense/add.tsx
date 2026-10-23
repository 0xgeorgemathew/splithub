import { createFileRoute } from "@tanstack/react-router";
import { AddExpenseForm } from "~~/components/expense/AddExpenseForm";

function AddExpensePage() {
  return <AddExpenseForm />;
}

export const Route = createFileRoute("/expense/add")({
  component: AddExpensePage,
});
