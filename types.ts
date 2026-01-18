
export interface TokenUsageRecord {
  timestamp: string;
  tokens: number;
}

export interface User {
  email: string;
  password?: string; // Ajouté pour la gestion locale
  role: 'student' | 'admin';
  firstName: string;
  xp: number;
  level: number;
  streak: number;
  lastActive: string;
  gradeLevel?: string;
  institutionCode?: string;
  classCode?: string;
  tokenHistory: TokenUsageRecord[];
}

export interface MathTip {
  n1: number;
  n2: number;
  tip: string;
  image?: string;
}

export interface InstitutionRequest {
  id: string;
  studentEmail: string;
  studentName: string;
  institutionName: string;
  className: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

export interface MindMapNode {
  id: string;
  text: string;
  type: 'round' | 'rect' | 'circle' | 'diamond';
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan';
  x: number;
  y: number;
}

export interface MindMapLink {
  from: string;
  to: string;
  text?: string;
  lineStyle?: 'solid' | 'dashed';
  lineType?: 'straight' | 'rounded';
}

export interface MindMap {
  id: string;
  title: string;
  nodes: MindMapNode[];
  links: MindMapLink[];
}

export interface SourceFile {
  id: string;
  name: string;
  type: string;
  date: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  summary?: string;
  keyPoints?: string[];
  definitions?: { term: string; definition: string }[];
  formulas?: string[];
  mindMaps?: MindMap[];
  sources: SourceFile[];
  type: 'photo' | 'text' | 'pdf';
  date: string;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'free';
  question: string;
  options?: string[];
  correctAnswer: string;
  hint: string;
  explanation: string;
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  CAPTURE = 'capture',
  REVISION_CARDS = 'revisions',
  QUIZ = 'quiz',
  CHAT = 'chat',
  MATHS = 'maths',
  DICTATION = 'dictation',
  LANGUAGES = 'languages',
  FLASH_REVISION = 'flash_revision',
  MIND_MAP_EDITOR = 'mindmap_editor',
  PROFILE = 'profile',
  ADMIN_MATH_TIPS = 'admin_math_tips',
  ADMIN_USERS = 'admin_users'
}
