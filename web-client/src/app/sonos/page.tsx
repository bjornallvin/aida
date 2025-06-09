"use client";

import React from "react";
import Link from "next/link";
import SonosManager from "@/components/SonosManager";

export default function SonosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Sonos Control Center
          </h1>
          <p className="text-gray-600">
            Control your Sonos speakers wirelessly
          </p>
        </header>

        {/* Navigation */}
        <nav className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-center space-x-6">
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                <span>Voice Assistant</span>
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href="/devices"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
                <span>Device Management</span>
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-gray-700 font-medium">Sonos Control</span>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <SonosManager />
      </div>
    </div>
  );
}
