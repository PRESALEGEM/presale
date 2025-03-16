"use client";

import { useState, useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
}

export const toast = ({ message, type = "info", duration = 3000 }: ToastProps) => {
  const event = new CustomEvent("toast", { detail: { message, type, duration } });
  window.dispatchEvent(event);
};

export const Toast = () => {
  const [toasts, setToasts] = useState<(ToastProps & { id: number })[]>([]);
  let toastCounter = 0;

  useEffect(() => {
    const handleToast = (e: Event) => {
      const data = (e as CustomEvent).detail as ToastProps;
      const id = toastCounter++;
      setToasts((prev) => [...prev, { ...data, id }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, data.duration);
    };

    window.addEventListener("toast", handleToast);
    return () => window.removeEventListener("toast", handleToast);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            p-4 rounded-md shadow-lg text-white font-medium min-w-[200px] max-w-md animate-in slide-in-from-bottom-5
            ${
              toast.type === "success"
                ? "bg-green-500"
                : toast.type === "error"
                ? "bg-red-500"
                : "bg-blue-500"
            }
          `}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}; 