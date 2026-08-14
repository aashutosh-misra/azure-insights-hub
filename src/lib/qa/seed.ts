import type { QaState } from "./types";

export const STATUSES = [
  "Requirement Gathering",
  "Development in Progress",
  "Released to SA",
  "Testing in Progress",
  "Released to UAT",
  "Customer Signoff",
  "Go-Live",
] as const;

export const EXEC_STATUSES = [
  "Not Executed",
  "In Progress",
  "Pass",
  "Fail",
  "Hold",
  "Skipped",
] as const;

export const ROLES = [
  "Admin",
  "Portfolio Manager",
  "Dev Manager",
  "QA Manager",
  "Dev Engineer",
  "QA Engineer",
] as const;

export const CORES = ["Symitar", "DNA", "Keystone", "Portico", "Other"] as const;

export const SEVERITIES = ["Critical", "High", "Medium", "Low"] as const;

export const DEFECT_SLA_DAYS: Record<string, number> = {
  Critical: 2,
  High: 5,
  Medium: 10,
  Low: 20,
};

export const DEFECT_STATUSES = ["Open", "In Progress", "Retest", "Closed", "Deferred"] as const;

export function makeSeed(): QaState {
  return {
    modules: [
      { id: "m1", name: "Member 360", proj: "CRM Phase 1", esg: "Akshitij", sag: "Ashutosh", saRel: "13-May-26", uat: "19-Jun-26", status: "Testing in Progress", bugs: 3, reqs: 45, totalReqs: 50 },
      { id: "m2", name: "Account 360", proj: "CRM Phase 1", esg: "Akshitij", sag: "Ashutosh", saRel: "13-May-26", uat: "19-Jun-26", status: "Testing in Progress", bugs: 5, reqs: 40, totalReqs: 48 },
      { id: "m3", name: "Holding 360", proj: "CRM Phase 1", esg: "Akshitij", sag: "Ashutosh", saRel: "13-May-26", uat: "", status: "Released to SA", bugs: 7, reqs: 30, totalReqs: 42 },
      { id: "m4", name: "Case Management", proj: "CRM Phase 1", esg: "Akrati", sag: "Ashutosh", saRel: "11-May-26", uat: "", status: "Testing in Progress", bugs: 14, reqs: 38, totalReqs: 50 },
      { id: "m5", name: "Summary Page", proj: "CRM Phase 1", esg: "Akrati", sag: "Ashutosh", saRel: "11-May-26", uat: "", status: "Testing in Progress", bugs: 4, reqs: 22, totalReqs: 28 },
      { id: "m6", name: "Offers", proj: "CRM Phase 2", esg: "Akrati", sag: "Ashutosh", saRel: "14-May-26", uat: "", status: "Released to SA", bugs: 2, reqs: 18, totalReqs: 20 },
      { id: "m7", name: "Leads-Sales", proj: "CRM Phase 2", esg: "Akrati", sag: "Ashutosh", saRel: "18-May-26", uat: "", status: "Development in Progress", bugs: 9, reqs: 0, totalReqs: 35 },
      { id: "m8", name: "CTI", proj: "Integrations", esg: "Akrati", sag: "Ashutosh", saRel: "14-May-26", uat: "", status: "Testing in Progress", bugs: 11, reqs: 30, totalReqs: 38 },
      { id: "m9", name: "ML Analytics", proj: "Analytics", esg: "Radhika", sag: "Ashutosh", saRel: "14-May-26", uat: "", status: "Testing in Progress", bugs: 3, reqs: 20, totalReqs: 25 },
      { id: "m10", name: "Dashboard", proj: "Analytics", esg: "Radhika", sag: "Ashutosh", saRel: "TBD", uat: "", status: "Requirement Gathering", bugs: 8, reqs: 0, totalReqs: 38 },
    ],
    testCases: [
      { id: "tc1", title: "Verify member login with valid credentials", moduleId: "m1", type: "Functional", priority: "High", assignee: "Akrati", status: "Pass", desc: "Test member login flow", steps: "1. Navigate to login\n2. Enter credentials\n3. Click Login", expected: "User logged in successfully", actual: "User logged in", defect: "", createdAt: "2026-05-01", automation: "Automated", reqIds: [], activity: [], tags: "" },
      { id: "tc2", title: "Verify member profile update", moduleId: "m1", type: "Functional", priority: "Medium", assignee: "Rohit", status: "Pass", desc: "Update member profile fields", steps: "1. Login\n2. Navigate to profile\n3. Update fields\n4. Save", expected: "Profile updated successfully", actual: "Profile saved", defect: "", createdAt: "2026-05-01", automation: "Manual", reqIds: [], activity: [], tags: "" },
      { id: "tc3", title: "Verify member 360 search filters", moduleId: "m1", type: "Functional", priority: "High", assignee: "Akrati", status: "Fail", desc: "Test search and filter functionality", steps: "1. Login\n2. Navigate to Member 360\n3. Apply filters", expected: "Filtered results displayed correctly", actual: "Filters not working for date range", defect: "BUG-001", createdAt: "2026-05-02", automation: "Manual", reqIds: ["r2"], activity: [], tags: "" },
      { id: "tc4", title: "Account balance display accuracy", moduleId: "m2", type: "Functional", priority: "High", assignee: "Akshitij", status: "Pass", desc: "Verify account balances shown correctly", steps: "1. Navigate to Account 360\n2. Select account", expected: "Correct balance displayed", actual: "Balance displayed correctly", defect: "", createdAt: "2026-05-02", automation: "Automated", reqIds: ["r3"], activity: [], tags: "" },
      { id: "tc5", title: "Account transaction history pagination", moduleId: "m2", type: "Functional", priority: "Medium", assignee: "Rohit", status: "Fail", desc: "Test pagination in transaction history", steps: "1. Open account\n2. View transactions\n3. Click next page", expected: "Next page loads", actual: "Page does not load after page 3", defect: "BUG-002", createdAt: "2026-05-03", automation: "Manual", reqIds: [], activity: [], tags: "" },
      { id: "tc6", title: "Case creation workflow", moduleId: "m4", type: "Functional", priority: "High", assignee: "Akrati", status: "Pass", desc: "Test full case creation", steps: "1. Click New Case\n2. Fill details\n3. Submit", expected: "Case created with unique ID", actual: "Case created successfully", defect: "", createdAt: "2026-05-03", automation: "Manual", reqIds: [], activity: [], tags: "" },
      { id: "tc7", title: "Case escalation logic", moduleId: "m4", type: "Integration", priority: "High", assignee: "Gaurav", status: "Fail", desc: "Test auto-escalation", steps: "1. Create case\n2. Set priority High\n3. Check escalation", expected: "Auto-escalated within 2 hours", actual: "No escalation triggered", defect: "BUG-003", createdAt: "2026-05-04", automation: "Manual", reqIds: ["r4"], activity: [], tags: "" },
      { id: "tc8", title: "Summary page KPI accuracy", moduleId: "m5", type: "Functional", priority: "Medium", assignee: "Sneha", status: "Pass", desc: "Verify KPI calculations", steps: "1. Open Summary\n2. Check KPIs", expected: "Accurate KPI values", actual: "KPIs correct", defect: "", createdAt: "2026-05-04", automation: "Automated", reqIds: [], activity: [], tags: "" },
      { id: "tc9", title: "Offer eligibility rules engine", moduleId: "m6", type: "Functional", priority: "High", assignee: "Akrati", status: "Not Executed", desc: "Test offer eligibility logic", steps: "1. Login as customer\n2. Check offers tab", expected: "Eligible offers displayed", actual: "", defect: "", createdAt: "2026-05-05", automation: "Manual", reqIds: [], activity: [], tags: "" },
      { id: "tc10", title: "CTI screen pop on call connect", moduleId: "m8", type: "Integration", priority: "High", assignee: "Akshitij", status: "Fail", desc: "Test CTI screen pop", steps: "1. Initiate call\n2. Check screen pop", expected: "Customer details pop up", actual: "Screen pop delayed by 5s", defect: "BUG-004", createdAt: "2026-05-05", automation: "Manual", reqIds: ["r5"], activity: [], tags: "" },
      { id: "tc11", title: "ML model prediction accuracy", moduleId: "m9", type: "Functional", priority: "Medium", assignee: "Radhika", status: "Pass", desc: "Test ML predictions", steps: "1. Trigger prediction\n2. Compare output", expected: "\u226585% accuracy", actual: "87% accuracy achieved", defect: "", createdAt: "2026-05-06", automation: "Automated", reqIds: [], activity: [], tags: "" },
      { id: "tc12", title: "Holding period calculation", moduleId: "m3", type: "Functional", priority: "High", assignee: "Akrati", status: "Not Executed", desc: "Verify holding period logic", steps: "1. Create holding\n2. Check dates", expected: "Correct holding period computed", actual: "", defect: "", createdAt: "2026-05-06", automation: "Manual", reqIds: [], activity: [], tags: "" },
      { id: "tc13", title: "Leads pipeline stage transitions", moduleId: "m7", type: "Functional", priority: "Medium", assignee: "Gaurav", status: "Not Executed", desc: "Test lead stage flow", steps: "1. Create lead\n2. Move through stages", expected: "All stages transition correctly", actual: "", defect: "", createdAt: "2026-05-07", automation: "Manual", reqIds: [], activity: [], tags: "" },
      { id: "tc14", title: "Dashboard widget refresh", moduleId: "m10", type: "Functional", priority: "Low", assignee: "Radhika", status: "Not Executed", desc: "Verify dashboard auto-refresh", steps: "1. Open dashboard\n2. Wait 30s", expected: "Widgets refresh automatically", actual: "", defect: "", createdAt: "2026-05-07", automation: "Manual", reqIds: [], activity: [], tags: "" },
    ],
    testPlans: [
      { id: "tp1", name: "CRM Phase 1 \u2013 Regression Cycle 1", proj: "CRM Phase 1", type: "Regression", start: "2026-05-10", end: "2026-05-25", owner: "Ashutosh", status: "In Progress", desc: "Full regression for CRM Phase 1 modules", tcIds: ["tc1", "tc2", "tc3", "tc4", "tc5", "tc6", "tc7", "tc8"], approval: { status: "Approved", approver: "Ashutosh", comments: "", date: "2026-05-09" } },
      { id: "tp2", name: "Integrations \u2013 Smoke Test", proj: "Integrations", type: "Smoke", start: "2026-05-12", end: "2026-05-15", owner: "Akshitij", status: "In Progress", desc: "Smoke test for CTI integration", tcIds: ["tc10"], approval: { status: "Not Submitted", approver: "", comments: "", date: "" } },
      { id: "tp3", name: "Analytics \u2013 Full Suite", proj: "Analytics", type: "Full", start: "2026-05-20", end: "2026-06-05", owner: "Radhika", status: "Draft", desc: "Full test suite for analytics modules", tcIds: ["tc11", "tc14"], approval: { status: "Not Submitted", approver: "", comments: "", date: "" } },
    ],
    tasks: [
      { id: "task1", title: "Execute Member 360 regression", assignee: "Akrati", planId: "tp1", moduleId: "m1", priority: "High", due: "2026-05-20", status: "In Progress", notes: "Focus on filter and search scenarios", createdAt: "2026-05-10" },
      { id: "task2", title: "Execute Account 360 test cases", assignee: "Rohit", planId: "tp1", moduleId: "m2", priority: "High", due: "2026-05-22", status: "Assigned", notes: "Cover all transaction history pages", createdAt: "2026-05-10" },
      { id: "task3", title: "CTI smoke test execution", assignee: "Akshitij", planId: "tp2", moduleId: "m8", priority: "High", due: "2026-05-15", status: "In Progress", notes: "Test screen pop with live call simulation", createdAt: "2026-05-12" },
    ],
    users: [
      { id: "u1", name: "Ashutosh", email: "ashutosh@company.com", role: "Admin", status: "Active", assignedProjects: [], theme: "emerald" },
      { id: "u2", name: "Vikram", email: "vikram@company.com", role: "Portfolio Manager", status: "Active", assignedProjects: [], theme: "ocean" },
      { id: "u3", name: "Akrati", email: "akrati@company.com", role: "QA Manager", status: "Active", assignedProjects: ["CRM Phase 1", "CRM Phase 2"], theme: "emerald" },
      { id: "u4", name: "Akshitij", email: "akshitij@company.com", role: "Dev Manager", status: "Active", assignedProjects: ["CRM Phase 1", "Integrations"], theme: "slate" },
      { id: "u5", name: "Radhika", email: "radhika@company.com", role: "QA Manager", status: "Active", assignedProjects: ["Analytics"], theme: "royal" },
      { id: "u6", name: "Gaurav", email: "gaurav@company.com", role: "QA Engineer", status: "Active", assignedProjects: ["CRM Phase 2"], theme: "emerald" },
      { id: "u7", name: "Priya", email: "priya@company.com", role: "QA Engineer", status: "Active", assignedProjects: ["CRM Phase 1"], theme: "rose" },
      { id: "u8", name: "Rohit", email: "rohit@company.com", role: "Dev Engineer", status: "Active", assignedProjects: ["CRM Phase 1"], theme: "emerald" },
      { id: "u9", name: "Sneha", email: "sneha@company.com", role: "Dev Engineer", status: "Active", assignedProjects: ["CRM Phase 1"], theme: "emerald" },
    ],
    projects: [
      { id: "p1", name: "CRM Phase 1", core: "Symitar", desc: "Customer relationship management platform \u2014 phase 1 rollout", owner: "Akshitij", status: "Active", start: "2026-03-01", end: "2026-06-30" },
      { id: "p2", name: "CRM Phase 2", core: "DNA", desc: "CRM phase 2 \u2014 leads, sales & offers modules", owner: "Akrati", status: "Active", start: "2026-05-01", end: "2026-08-31" },
      { id: "p3", name: "Integrations", core: "Keystone", desc: "Third-party and CTI integrations", owner: "Akshitij", status: "Active", start: "2026-04-01", end: "2026-06-15" },
      { id: "p4", name: "Analytics", core: "Portico", desc: "ML analytics & reporting dashboards", owner: "Radhika", status: "Active", start: "2026-04-15", end: "2026-07-15" },
    ],
    defects: [
      { id: "d1", defectId: "BUG-001", title: "Member 360 date range filter not working", severity: "High", priority: "High", status: "Open", moduleId: "m1", testCaseId: "tc3", assignee: "Akrati", reporter: "Akrati", createdAt: "2026-05-02", comments: [] },
      { id: "d2", defectId: "BUG-002", title: "Transaction history pagination fails after page 3", severity: "Medium", priority: "Medium", status: "Open", moduleId: "m2", testCaseId: "tc5", assignee: "Rohit", reporter: "Rohit", createdAt: "2026-05-03", comments: [] },
      { id: "d3", defectId: "BUG-003", title: "Case auto-escalation not triggered", severity: "High", priority: "Critical", status: "Retest", moduleId: "m4", testCaseId: "tc7", assignee: "Gaurav", reporter: "Gaurav", createdAt: "2026-05-04", comments: [] },
      { id: "d4", defectId: "BUG-004", title: "CTI screen pop delayed by 5 seconds", severity: "Critical", priority: "High", status: "Open", moduleId: "m8", testCaseId: "tc10", assignee: "Akshitij", reporter: "Akshitij", createdAt: "2026-05-05", comments: [] },
    ],
    requirements: [
      { id: "r1", reqId: "REQ-101", title: "Member profile must support inline editing", moduleId: "m1", priority: "High" },
      { id: "r2", reqId: "REQ-102", title: "Search must support date-range filtering", moduleId: "m1", priority: "High" },
      { id: "r3", reqId: "REQ-201", title: "Account balances must reconcile with core banking feed", moduleId: "m2", priority: "High" },
      { id: "r4", reqId: "REQ-401", title: "Case escalation must trigger within SLA", moduleId: "m4", priority: "High" },
      { id: "r5", reqId: "REQ-801", title: "CTI screen pop must appear within 2 seconds", moduleId: "m8", priority: "Medium" },
    ],
    templates: [
      { id: "t1", name: "Login / Authentication", type: "Functional", priority: "High", desc: "Verify login flow with valid/invalid credentials.", steps: "1. Navigate to login page\n2. Enter credentials\n3. Click Login", expected: "User is authenticated and redirected appropriately." },
      { id: "t2", name: "CRUD - Create Record", type: "Functional", priority: "Medium", desc: "Verify creation of a new record.", steps: "1. Open create form\n2. Fill required fields\n3. Submit", expected: "Record is created and visible in the list." },
      { id: "t3", name: "Search & Filter", type: "Functional", priority: "Medium", desc: "Verify search/filter returns correct results.", steps: "1. Enter search criteria\n2. Apply filters\n3. Review results", expected: "Only matching records are displayed." },
      { id: "t4", name: "API Integration", type: "Integration", priority: "High", desc: "Verify API request/response handling.", steps: "1. Trigger the integration action\n2. Inspect request payload\n3. Verify response handling", expected: "Correct data is sent/received and reflected in UI." },
      { id: "t5", name: "Negative / Validation", type: "Functional", priority: "Medium", desc: "Verify system rejects invalid input with a clear error.", steps: "1. Enter invalid data\n2. Submit\n3. Observe validation message", expected: "Appropriate validation error is shown; no invalid data is saved." },
      { id: "t6", name: "Performance / Load", type: "Performance", priority: "Low", desc: "Verify acceptable response time under expected load.", steps: "1. Simulate expected concurrent load\n2. Measure response times\n3. Compare against SLA", expected: "Response times remain within agreed SLA thresholds." },
    ],
    libraryCases: [
      { id: "lc1", core: "Symitar", area: "Member Services", title: "Verify member inquiry by account number", type: "Functional", priority: "High", desc: "Core member inquiry lookup.", steps: "1. Open member inquiry\n2. Enter account number\n3. Submit", expected: "Member record is returned with correct demographics.", tags: "core,inquiry" },
      { id: "lc2", core: "Symitar", area: "Teller", title: "Validate deposit posting to share account", type: "Functional", priority: "Critical", desc: "Teller deposit posting.", steps: "1. Open teller screen\n2. Post deposit\n3. Confirm", expected: "Balance increases by deposit amount and receipt prints.", tags: "teller,posting" },
      { id: "lc3", core: "Symitar", area: "Loans", title: "Loan payment allocation to principal and interest", type: "Functional", priority: "High", desc: "Payment split validation.", steps: "1. Post loan payment\n2. Review allocation", expected: "Principal/interest split matches amortisation schedule.", tags: "loans" },
      { id: "lc4", core: "DNA", area: "Deposits", title: "Open new savings account with minimum balance", type: "Functional", priority: "High", desc: "Account origination.", steps: "1. Start new account wizard\n2. Complete KYC\n3. Fund account", expected: "Account is opened and visible in person overview.", tags: "deposits" },
      { id: "lc5", core: "DNA", area: "Payments", title: "ACH batch processing end of day", type: "Integration", priority: "Critical", desc: "ACH EOD batch.", steps: "1. Queue ACH batch\n2. Run EOD\n3. Verify postings", expected: "All ACH entries post and settle without exceptions.", tags: "ach,eod" },
      { id: "lc6", core: "DNA", area: "Cards", title: "Debit card authorisation hold release", type: "Functional", priority: "Medium", desc: "Auth hold lifecycle.", steps: "1. Create authorisation\n2. Settle transaction", expected: "Hold releases and available balance updates.", tags: "cards" },
      { id: "lc7", core: "Keystone", area: "Online Banking", title: "Member self-service password reset", type: "Functional", priority: "High", desc: "Self-service reset.", steps: "1. Click forgot password\n2. Verify OTP\n3. Set new password", expected: "Password is reset and member can sign in.", tags: "digital" },
      { id: "lc8", core: "Portico", area: "Reporting", title: "Month-end GL reconciliation report", type: "Functional", priority: "High", desc: "GL reconciliation.", steps: "1. Run month-end report\n2. Compare to GL", expected: "Report totals reconcile to the general ledger.", tags: "gl,reporting" },
    ],
    history: [],
    settings: {
      sessionTimeoutMins: 30,
      maintenanceMode: false,
      maintenanceMsg: "",
      azureStaleThresholdDays: 14,
      ssoEnabled: false,
      ssoProvider: "Microsoft",
      ssoClientId: "",
      ssoTenant: "",
      ssoEnforce: false,
    },
    activity: [],
    currentUserId: "u1",
    currentProject: "All",
  };
}
