import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { GitHubBadge } from './components/GitHubBadge';
import { AlgorithmModal } from './components/AlgorithmModal';
import { DataInput } from './components/DataInput';
import { CodePanel } from './components/CodePanel';
import { Canvas } from './components/Canvas';
import { ControlPanel } from './components/ControlPanel';
import { WeChatFloat } from './components/WeChatFloat';
import { Language, ProblemData, AlgorithmStep } from './types';

// 题目配置
const PROBLEM_CONFIG = {
  number: {题号},
  title: '{中文标题}',
  slug: '{slug}',
  githubRepo: '{github_repo}'
};

// 算法思路
const ALGORITHM_THOUGHT = `
## 解题思路

1. **问题分析**
   - 描述问题核心
   - 输入输出格式
   
2. **算法选择**
   - 为什么选这个算法
   - 时间复杂度分析
   
3. **关键步骤**
   - 步骤1
   - 步骤2
   
4. **复杂度**
   - 时间: O(?)
   - 空间: O(?)
`;

// 样例输入
const SAMPLE_INPUTS: ProblemData[] = [
  { input: /* 样例1 */ },
  { input: /* 样例2 */ }
];

// 代码
const CODES: Record<Language, string> = {
  java: `
// Java代码
class Solution {
    public int solve(int[] nums) {
        // 实现
        return 0;
    }
}
`,
  python: `
# Python代码
class Solution:
    def solve(self, nums: List[int]) -> int:
        # 实现
        return 0
`,
  go: `
// Go代码
func solve(nums []int) int {
    // 实现
    return 0
}
`,
  javascript: `
// JavaScript代码
function solve(nums) {
    // 实现
    return 0;
}
`
};

// 动画步骤
const STEPS: AlgorithmStep[] = [
  {
    id: 0,
    description: '初始化',
    codeLines: {
      java: [1],
      python: [1],
      go: [1],
      javascript: [1]
    },
    highlightElements: [],
    annotations: []
  }
  // ... 更多步骤
];

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [data, setData] = useState<ProblemData>(SAMPLE_INPUTS[0]);
  const [speed, setSpeed] = useState(1);

  // 播放控制
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= STEPS.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  const handlePrev = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep(prev => Math.min(STEPS.length - 1, prev + 1));
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  const handleSeek = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#f3f4f6'
    }}>
      <Header
        problemNumber={PROBLEM_CONFIG.number}
        problemTitle={PROBLEM_CONFIG.title}
        problemSlug={PROBLEM_CONFIG.slug}
      />
      
      <GitHubBadge repoUrl={PROBLEM_CONFIG.githubRepo} />
      
      <AlgorithmModal title="算法思路" content={ALGORITHM_THOUGHT} />
      
      <DataInput
        onDataChange={setData}
        sampleInputs={SAMPLE_INPUTS}
        validateInput={(input) => {
          // 实现验证逻辑
          return { valid: true, parsed: input };
        }}
        generateRandom={() => {
          // 实现随机生成逻辑
          return { input: [] };
        }}
      />
      
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '16px',
        padding: '16px',
        overflow: 'hidden'
      }}>
        <div style={{ flex: 1 }}>
          <Canvas
            steps={STEPS}
            currentStep={currentStep}
            data={data}
            algorithmType="array"
          />
        </div>
        
        <div style={{ width: '400px' }}>
          <CodePanel
            codes={CODES}
            currentStep={currentStep}
            stepToLines={STEPS.reduce((acc, step) => {
              acc[step.id] = step.codeLines;
              return acc;
            }, {} as Record<number, Record<Language, number[]>>)}
            variables={STEPS.reduce((acc, step) => {
              acc[step.id] = {};
              return acc;
            }, {} as Record<number, Record<string, any>>)}
          />
        </div>
      </div>
      
      <ControlPanel
        currentStep={currentStep}
        totalSteps={STEPS.length}
        isPlaying={isPlaying}
        onPrev={handlePrev}
        onNext={handleNext}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        onSeek={handleSeek}
      />
      
      <WeChatFloat />
    </div>
  );
}

export default App;
