"use client";

import { useEffect } from "react";
// import { useRouter } from "next/navigation";

export default function AdminPanel() {
  // const router = useRouter();

  useEffect(() => {
    // This will be protected by middleware, but we can add client-side check too
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage restaurants and menus</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to Admin Panel</h2>
          <p className="text-gray-600">
            This is a placeholder for the admin dashboard. Restaurant onboarding features will be added here.
          </p>
        </div>
      </div>
    </div>
  );
}

