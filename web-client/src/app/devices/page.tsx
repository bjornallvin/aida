"use client";

import React from "react";
import Link from "next/link";
import { DeviceManager } from "../../components/DeviceManager";

export default function DevicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Smart Home Devices
          </h1>
          <p className="text-gray-600">
            Manage your IKEA DIRIGERA connected devices
          </p>
        </header>

        {/* Navigation */}
        <nav className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded-md transition-colors"
              >
                ← Back to Voice Assistant
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-gray-700 font-medium">
                Device Management
              </span>
            </div>
          </div>
        </nav>

        {/* Device Manager Component */}
        <DeviceManager />

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>
            Aida Device Management - Control and configure your smart home
            devices
          </p>
          <div className="mt-2">
            <span className="text-gray-400">IKEA DIRIGERA Integration</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
