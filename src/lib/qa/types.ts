export type ModuleStatus =
  | "Requirement Gathering"
  | "Development in Progress"
  | "Released to SA"
  | "Testing in Progress"
  | "Released to UAT"
  | "Customer Signoff"
  | "Go-Live";

export type ExecStatus = "Not Executed" | "In Progress" | "Pass" | "Fail" | "Hold" | "Skipped";
export type Severity = "Critical" | "High" | "Medium" | "Low";
export type Role =
  | "Admin"
  | "Portfolio Manager"
  | "Dev Manager"
  | "QA Manager"
  | "Dev Engineer"
  | "QA Engineer";

export interface QaModule {
  id: string;
  name: string;
  proj: string;
  esg: string;
  sag: string;
  saRel: string;
  uat: string;
  status: ModuleStatus;
  bugs: number;
  reqs: number;
  totalReqs: number;
}

export interface ActivityEntry {
  ts: string;
  user: string;
  text: string;
}

export interface TestCase {
  id: string;
  title: string;
  moduleId: string;
  type: string;
  priority: Severity;
  assignee: string;
  status: ExecStatus;
  desc: string;
  steps: string;
  expected: string;
  actual: string;
  defect: string;
  createdAt: string;
  automation: "Manual" | "Automated";
  reqIds: string[];
  activity: ActivityEntry[];
  tags: string;
}

export interface TestPlan {
  id: string;
  name: string;
  proj: string;
  type: string;
  start: string;
  end: string;
  owner: string;
  status: string;
  desc: string;
  tcIds: string[];
  approval: { status: string; approver: string; comments: string; date: string };
}

export interface Task {
  id: string;
  title: string;
  assignee: string;
  planId: string;
  moduleId: string;
  priority: Severity;
  due: string;
  status: string;
  notes: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  assignedProjects: string[];
  theme: string;
}

export type Core = "Symitar" | "DNA" | "Keystone" | "Portico" | "Other";

export interface LibraryCase {
  id: string;
  core: Core;
  area: string;
  title: string;
  type: string;
  priority: Severity;
  desc: string;
  steps: string;
  expected: string;
  tags: string;
}

export interface Project {
  id: string;
  name: string;
  core: Core;
  desc: string;
  owner: string;
  status: string;
  start: string;
  end: string;
}

export interface Defect {
  id: string;
  defectId: string;
  title: string;
  severity: Severity;
  priority: Severity;
  status: string;
  moduleId: string;
  testCaseId: string;
  assignee: string;
  reporter: string;
  createdAt: string;
  comments: ActivityEntry[];
}

export interface Requirement {
  id: string;
  reqId: string;
  title: string;
  moduleId: string;
  priority: Severity;
}

export interface Template {
  id: string;
  name: string;
  type: string;
  priority: Severity;
  desc: string;
  steps: string;
  expected: string;
}

export interface HistorySnapshot {
  date: string;
  executed: number;
  passed: number;
  failed: number;
  total: number;
}

export interface AdminSettings {
  sessionTimeoutMins: number;
  maintenanceMode: boolean;
  maintenanceMsg: string;
  azureStaleThresholdDays: number;
  ssoEnabled: boolean;
  ssoProvider: string;
  ssoClientId: string;
  ssoTenant: string;
  ssoEnforce: boolean;
}

export interface ActivityLog {
  id: string;
  ts: string;
  user: string;
  action: string;
}

export interface QaState {
  modules: QaModule[];
  testCases: TestCase[];
  testPlans: TestPlan[];
  tasks: Task[];
  users: User[];
  projects: Project[];
  defects: Defect[];
  requirements: Requirement[];
  templates: Template[];
  libraryCases: LibraryCase[];
  history: HistorySnapshot[];
  settings: AdminSettings;
  activity: ActivityLog[];
  currentUserId: string;
  currentProject: string;
}
