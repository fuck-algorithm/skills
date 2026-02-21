export type Language = 'java' | 'python' | 'go' | 'javascript';

export type AlgorithmType = 'array' | 'linked_list' | 'binary_tree' | 'graph' | 'dp' | 'other';

export interface AlgorithmStep {
  id: number;
  description: string;
  codeLines: Record<Language, number[]>;
  highlightElements: string[];
  annotations: Annotation[];
}

export interface Annotation {
  target: string;
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface ProblemData {
  input: any;
  expectedOutput?: any;
}

export interface ProblemConfig {
  number: number;
  title: string;
  slug: string;
  githubRepo: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface TreeNode {
  val: number;
  left?: TreeNode;
  right?: TreeNode;
  x?: number;
  y?: number;
}

export interface ListNode {
  val: number;
  next?: ListNode;
  x?: number;
  y?: number;
}
