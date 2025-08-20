"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/lib/auth/authStore";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, getCurrentUser } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await getCurrentUser();
        if (isAuthenticated) {
          router.push("/dashboard");
        } else {
          router.push("/login");
        }
      } catch (error) {
        router.push("/login");
      }
    };

    checkAuth();
  }, [isAuthenticated, router, getCurrentUser]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl">加载中...</div>
    </div>
  );
}
