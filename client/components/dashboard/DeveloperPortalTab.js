"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import APIUsageChart from "./DeveloperPortal/APIUsageChart"
import TotalMemoriesCounter from "./DeveloperPortal/TotalMemoriesCounter"
import VectorIndexHealth from "./DeveloperPortal/VectorIndexHealth"
import AddManualMemoryForm from "./DeveloperPortal/AddManualMemoryForm"
import RequestLogsTable from "./DeveloperPortal/RequestLogsTable"
import RateLimitsAndKeys from "./DeveloperPortal/RateLimitsAndKeys"

export default function DeveloperPortalTab({ conversationId }) {
  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TotalMemoriesCounter conversationId={conversationId} />
        <VectorIndexHealth conversationId={conversationId} />
      </div>

      {/* API Usage Chart */}
      <APIUsageChart conversationId={conversationId} />

      {/* Manual Memory Form */}
      <AddManualMemoryForm conversationId={conversationId} />

      {/* Request Logs */}
      <RequestLogsTable conversationId={conversationId} />

      {/* API Keys */}
      <RateLimitsAndKeys />
    </div>
  )
}

