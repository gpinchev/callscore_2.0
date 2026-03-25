"use client";

import { UserPlus, Phone, MessageSquare, ChevronDown } from "lucide-react";

export function EngageTopBar() {
  return (
    <>
      {/* Row 1: Dark navy bar */}
      <div
        className="flex h-12 flex-none items-center justify-between px-4"
        style={{ backgroundColor: "#00034D" }}
      >
        {/* Logo + divider + wordmark */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" width={34} height={34} style={{ borderRadius: 7 }} />
          <div className="h-5 w-px bg-white/20" />
          <span className="text-sm font-semibold tracking-[0.15em] text-white">
            ENGAGE
          </span>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-5">
          {/* Red alert badge */}
          <div className="relative">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              !
            </span>
          </div>
          <UserPlus className="h-5 w-5 text-white/70 cursor-pointer hover:text-white" />
          <Phone className="h-5 w-5 text-white/70 cursor-pointer hover:text-white" />
          <MessageSquare className="h-5 w-5 text-white/70 cursor-pointer hover:text-white" />
          {/* Account */}
          <button className="flex items-center gap-1 text-white/70 hover:text-white">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Row 2: White settings bar */}
      <div className="flex h-12 flex-none items-center justify-between border-b bg-white px-4">
        <div className="flex items-center gap-3">
          <button className="text-gray-500 hover:text-gray-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
          <span className="text-base font-semibold text-gray-900">Settings</span>
        </div>
        {/* GP avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-xs font-semibold text-white">
          GP
        </div>
      </div>
    </>
  );
}
