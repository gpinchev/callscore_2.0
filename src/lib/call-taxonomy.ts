export const CALL_TAXONOMY = {
  "New Customer": {
    intents: [
      "Estimate Request",
      "Emergency Repair",
      "Standard Repair",
      "Installation / Replacement",
      "Maintenance / Tune-Up",
      "Financing Inquiry",
      "General Inquiry",
    ],
    outcomes: [
      "Appointment Booked",
      "Estimate Scheduled",
      "Transferred to Sales",
      "Call Abandoned",
      "No Service Area / Rejected",
      "Left Voicemail",
      "No Booking (Price Shopping)",
    ],
  },
  "Existing Customer": {
    intents: [
      "Emergency Repair",
      "Standard Repair",
      "Maintenance / Tune-Up",
      "Follow-Up / Status Check",
      "Billing / Payment Inquiry",
      "Warranty Claim",
    ],
    outcomes: [
      "Appointment Booked",
      "Rescheduled",
      "Issue Resolved on Call",
      "Escalated to Technician",
      "Transferred to Billing",
      "Left Voicemail",
      "No Action Needed",
    ],
  },
  "Maintenance Plan Member": {
    intents: [
      "Scheduled Maintenance",
      "Priority Repair",
      "Plan Renewal Inquiry",
      "Benefit Question",
    ],
    outcomes: [
      "Appointment Booked",
      "Priority Dispatch",
      "Plan Renewed",
      "Plan Upsell",
      "Left Voicemail",
    ],
  },
  "Vendor / Supplier": {
    intents: [
      "Delivery Coordination",
      "Product Inquiry",
      "Partnership Discussion",
    ],
    outcomes: [
      "Transferred to Manager",
      "Follow-Up Scheduled",
      "No Action Needed",
    ],
  },
  "Recruiting / Job Applicant": {
    intents: [
      "Job Inquiry",
      "Application Follow-Up",
    ],
    outcomes: [
      "Transferred to HR",
      "Directed to Apply Online",
      "Follow-Up Scheduled",
    ],
  },
  "Solicitor / Telemarketer": {
    intents: [
      "Sales Pitch",
      "Marketing Offer",
    ],
    outcomes: [
      "Rejected / Declined",
      "Call Ended Quickly",
      "Blocked Number",
    ],
  },
  "Spam / Robocall": {
    intents: [
      "Robocall",
      "Scam Likely",
    ],
    outcomes: [
      "Blocked",
      "Ignored / Disconnected",
    ],
  },
  "Administrative": {
    intents: [
      "Schedule / Reschedule",
      "Cancellation",
      "Billing / Payment Inquiry",
      "General Inquiry",
    ],
    outcomes: [
      "Appointment Booked",
      "Rescheduled",
      "Cancelled",
      "Payment Collected",
      "Issue Resolved",
    ],
  },
  "Other / Edge Cases": {
    intents: [
      "Wrong Number",
      "Unknown",
    ],
    outcomes: [
      "No Action Needed",
      "Call Ended",
      "Unclassified",
    ],
  },
} as const;

export type CallType = keyof typeof CALL_TAXONOMY;
export const CALL_TYPES = Object.keys(CALL_TAXONOMY) as CallType[];

export function getIntents(callType: string | null | undefined): string[] {
  if (!callType || !(callType in CALL_TAXONOMY)) return [];
  return [...CALL_TAXONOMY[callType as CallType].intents];
}

export function getOutcomes(callType: string | null | undefined): string[] {
  if (!callType || !(callType in CALL_TAXONOMY)) return [];
  return [...CALL_TAXONOMY[callType as CallType].outcomes];
}

// All unique outcomes across all types (for flat filter lists)
export const ALL_OUTCOMES = [
  ...new Set(Object.values(CALL_TAXONOMY).flatMap((v) => v.outcomes)),
].sort();

export const ALL_INTENTS = [
  ...new Set(Object.values(CALL_TAXONOMY).flatMap((v) => v.intents)),
].sort();
