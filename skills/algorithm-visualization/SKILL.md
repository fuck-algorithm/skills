---
name: algorithm-visualization
description: 创建交互式算法可视化教学网站，支持LeetCode风格的代码演示和动画展示，使用TypeScript+React+D3.js技术栈
---

# 算法演示网站生成器

## 概述

本Skill指导你创建LeetCode风格的算法演示教学网站，包含完整的可视化、代码展示、动画演示功能。生成单屏幕应用，支持多种数据结构可视化。

## 核心设计原则

- **动画优先**：用视觉元素（箭头、颜色变化、运动轨迹）替代文字说明，让算法逻辑"动起来"
- **教育有效性**：专注于算法的核心逻辑步骤，避免分散注意力的装饰性元素
- **交互式学习**：提供分步控制让用户主动探索，比被动观看更有效
- **信息密度**：画布传递丰富的有用信息，而非增加毫无作用的动画

## 技术栈

- TypeScript
- React
- D3.js
- Vite
- IndexedDB（缓存）
- GitHub Pages（部署）

## 配色规范

- **严禁使用任何紫色系配色**（这是强制要求）
- 整体配色需要协调统一，不要出现乱七八糟的配色
- 推荐使用蓝色、绿色、橙色等协调色系
- 示例配色：
  - 主色调：#3b82f6（蓝色）
  - 次要色：#10b981（绿色）
  - 背景色：#f9fafb（浅灰）
  - 强调色：#f59e0b（橙色）

## 前置要求

- Node.js 18+
- Git
- GitHub账号

## 使用流程

### 第1步：收集题目信息

确认以下信息：
- LeetCode题号
- 题目中文标题
- 题目英文slug（用于生成链接）
- 题目描述
- 输入/输出格式说明
- 数据约束条件
- **多种解法的详细说明**（如果有多解法，每种解法需要独立页面）
- 每种解法的代码（Java/Python/Go/JavaScript）
- 算法思路说明

### 第2步：初始化项目

创建项目目录：
```bash
mkdir leetcode-{题号}-{slug}-visualization
cd leetcode-{题号}-{slug}-visualization
```

初始化项目：
```bash
npm create vite@latest . -- --template react-ts
npm install d3 @types/d3
npm install -D @types/react @types/react-dom
```

### 第3步：创建项目文件

#### 3.1 package.json
确保包含以下依赖：
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "d3": "^7.8.0"
  },
  "devDependencies": {
    "@types/d3": "^7.4.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

#### 3.2 vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/leetcode-{题号}-{slug}-visualization/',
  server: {
    port: {随机端口30000-65535}
  }
})
```

#### 3.3 tsconfig.json
使用标准React TypeScript配置。

#### 3.4 index.html
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LeetCode {题号}. {中文标题}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 第4步：实现核心组件

#### 4.1 类型定义 (src/types/index.ts)
```typescript
export type Language = 'java' | 'python' | 'go' | 'javascript';

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
```

#### 4.2 IndexedDB工具 (src/utils/db.ts)
```typescript
const DB_NAME = 'algorithm-viz';
const DB_VERSION = 1;

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
    };
  });
}

export async function getCache(key: string): Promise<any> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readonly');
    const store = tx.objectStore('cache');
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

export async function setCache(key: string, value: any, ttl?: number): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    const request = store.put({
      key,
      value,
      timestamp: Date.now(),
      ttl
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
```

#### 4.3 GitHub API工具 (src/utils/github-api.ts)
```typescript
import { getCache, setCache } from './db';

export async function getRepoStars(repoUrl: string): Promise<number> {
  const cacheKey = `stars:${repoUrl}`;
  
  // 检查缓存（1小时）
  const cached = await getCache(cacheKey);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return cached.value;
  }
  
  // 解析仓库信息
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return 0;
  
  const [, owner, repo] = match;
  
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!response.ok) throw new Error('Failed to fetch');
    
    const data = await response.json();
    const stars = data.stargazers_count;
    
    // 缓存结果
    await setCache(cacheKey, stars);
    return stars;
  } catch (error) {
    // 使用缓存的旧值或默认值
    return cached?.value || 0;
  }
}
```

#### 4.4 Header组件 (src/components/Header.tsx)
```typescript
import React from 'react';

interface HeaderProps {
  problemNumber: number;
  problemTitle: string;
  problemSlug: string;
}

export const Header: React.FC<HeaderProps> = ({
  problemNumber,
  problemTitle,
  problemSlug
}) => {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 20px',
      borderBottom: '1px solid #e5e7eb',
      position: 'relative'
    }}>
      {/* 返回链接 */}
      <a
        href="https://fuck-algorithm.github.io/leetcode-hot-100/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'absolute',
          left: '20px',
          fontSize: '14px',
          color: '#3b82f6',
          textDecoration: 'none'
        }}
      >
        ← 返回 LeetCode Hot 100
      </a>
      
      {/* 标题 */}
      <a
        href={`https://leetcode.cn/problems/${problemSlug}/`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#1f2937',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>LeetCode {problemNumber}.</span>
        <span>{problemTitle}</span>
      </a>
    </header>
  );
};
```

#### 4.5 GitHub徽标组件 (src/components/GitHubBadge.tsx)
```typescript
import React, { useEffect, useState } from 'react';
import { getRepoStars } from '../utils/github-api';

interface GitHubBadgeProps {
  repoUrl: string;
}

export const GitHubBadge: React.FC<GitHubBadgeProps> = ({ repoUrl }) => {
  const [stars, setStars] = useState<number>(0);

  useEffect(() => {
    getRepoStars(repoUrl).then(setStars);
  }, [repoUrl]);

  return (
    <a
      href={repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="去GitHub仓库Star支持一下 ⭐"
      style={{
        position: 'fixed',
        top: '12px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: '#f3f4f6',
        borderRadius: '6px',
        textDecoration: 'none',
        color: '#374151',
        fontSize: '14px',
        zIndex: 100
      }}
    >
      {/* GitHub图标 */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
      <span>⭐ {stars}</span>
    </a>
  );
};
```

#### 4.6 算法思路弹窗 (src/components/AlgorithmModal.tsx)
```typescript
import React, { useState } from 'react';

interface AlgorithmModalProps {
  title: string;
  content: string;
}

export const AlgorithmModal: React.FC<AlgorithmModalProps> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: '12px',
          right: '140px',
          padding: '6px 12px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          zIndex: 100
        }}
      >
        💡 算法思路
      </button>
      
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
            <h2>{title}</h2>
            <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
          </div>
        </div>
      )}
    </>
  );
};
```

#### 4.7 数据输入组件 (src/components/DataInput.tsx)
```typescript
import React, { useState } from 'react';
import { ProblemData } from '../types';

interface DataInputProps {
  onDataChange: (data: ProblemData) => void;
  sampleInputs: ProblemData[];
  validateInput: (input: string) => { valid: boolean; error?: string; parsed?: any };
  generateRandom: () => ProblemData;
}

export const DataInput: React.FC<DataInputProps> = ({
  onDataChange,
  sampleInputs,
  validateInput,
  generateRandom
}) => {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string>('');

  const handleCustomInput = (text: string) => {
    setInputText(text);
    const result = validateInput(text);
    if (result.valid) {
      setError('');
      onDataChange({ input: result.parsed });
    } else {
      setError(result.error || 'Invalid input');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 20px',
      borderBottom: '1px solid #e5e7eb'
    }}>
      <span style={{ fontSize: '14px', fontWeight: 500 }}>输入数据:</span>
      
      {/* 自定义输入 */}
      <input
        type="text"
        value={inputText}
        onChange={(e) => handleCustomInput(e.target.value)}
        placeholder="输入自定义数据"
        style={{
          flex: 1,
          padding: '6px 12px',
          border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
          borderRadius: '6px',
          fontSize: '14px'
        }}
      />
      
      {/* 样例选择 */}
      {sampleInputs.map((sample, idx) => (
        <button
          key={idx}
          onClick={() => onDataChange(sample)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#f3f4f6',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          样例 {idx + 1}
        </button>
      ))}
      
      {/* 随机生成 */}
      <button
        onClick={() => onDataChange(generateRandom())}
        style={{
          padding: '6px 12px',
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        🎲 随机
      </button>
      
      {error && (
        <span style={{ color: '#ef4444', fontSize: '12px' }}>{error}</span>
      )}
    </div>
  );
};
```

#### 4.8 代码展示面板 (src/components/CodePanel.tsx)
```typescript
import React, { useEffect, useState } from 'react';
import { Language } from '../types';
import { getCache, setCache } from '../utils/db';

interface CodePanelProps {
  codes: Record<Language, string>;
  currentStep: number;
  stepToLines: Record<number, Record<Language, number[]>>;
  variables: Record<number, Record<string, any>>;
}

const LANGUAGE_LABELS: Record<Language, string> = {
  java: 'Java',
  python: 'Python',
  go: 'Go',
  javascript: 'JavaScript'
};

export const CodePanel: React.FC<CodePanelProps> = ({
  codes,
  currentStep,
  stepToLines,
  variables
}) => {
  const [language, setLanguage] = useState<Language>('java');

  // 加载语言偏好
  useEffect(() => {
    getCache('preferred-language').then((cached) => {
      if (cached && codes[cached as Language]) {
        setLanguage(cached as Language);
      }
    });
  }, []);

  // 保存语言偏好
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCache('preferred-language', lang);
  };

  const currentLines = stepToLines[currentStep]?.[language] || [];
  const currentVars = variables[currentStep] || {};

  const lines = codes[language].split('\n');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#1f2937',
      color: '#e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      {/* 语言选择 */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px',
        borderBottom: '1px solid #374151'
      }}>
        {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            style={{
              padding: '4px 12px',
              backgroundColor: language === lang ? '#3b82f6' : 'transparent',
              color: language === lang ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        ))}
      </div>

      {/* 代码显示 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '13px',
        lineHeight: '1.5'
      }}>
        {lines.map((line, idx) => {
          const isHighlighted = currentLines.includes(idx + 1);
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                backgroundColor: isHighlighted ? '#374151' : 'transparent',
                padding: '2px 0'
              }}
            >
              <span style={{
                width: '40px',
                color: '#6b7280',
                textAlign: 'right',
                paddingRight: '12px',
                userSelect: 'none'
              }}>
                {idx + 1}
              </span>
              <span style={{ flex: 1, whiteSpace: 'pre' }}>{line}</span>
              {/* 变量值显示 */}
              {isHighlighted && Object.entries(currentVars).map(([name, value]) => {
                if (line.includes(name)) {
                  return (
                    <span
                      key={name}
                      style={{
                        marginLeft: '12px',
                        color: '#10b981',
                        fontSize: '11px'
                      }}
                    >
                      {name} = {JSON.stringify(value)}
                    </span>
                  );
                }
                return null;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

#### 4.9 控制面板组件 (src/components/ControlPanel.tsx)
```typescript
import React, { useEffect, useState, useCallback } from 'react';
import { getCache, setCache } from '../utils/db';

interface ControlPanelProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onReset: () => void;
  onSeek: (step: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentStep,
  totalSteps,
  isPlaying,
  onPrev,
  onNext,
  onPlayPause,
  onReset,
  onSeek
}) => {
  const [speed, setSpeed] = useState(1);

  // 加载速度偏好
  useEffect(() => {
    getCache('playback-speed').then((cached) => {
      if (cached) setSpeed(cached);
    });
  }, []);

  // 保存速度偏好
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    setCache('playback-speed', newSpeed);
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNext();
          break;
        case ' ':
          e.preventDefault();
          onPlayPause();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          onReset();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrev, onNext, onPlayPause, onReset]);

  const progress = totalSteps > 0 ? (currentStep / (totalSteps - 1)) * 100 : 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '16px 20px',
      backgroundColor: '#f9fafb',
      borderTop: '1px solid #e5e7eb'
    }}>
      {/* 控制按钮 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px'
      }}>
        <button onClick={onPrev} style={buttonStyle}>
          ← 上一步
        </button>
        
        <button onClick={onPlayPause} style={{ ...buttonStyle, minWidth: '80px' }}>
          {isPlaying ? '⏸ 暂停' : '▶ 播放'} [空格]
        </button>
        
        <button onClick={onNext} style={buttonStyle}>
          下一步 →
        </button>
        
        <button onClick={onReset} style={buttonStyle}>
          ↺ 重置 [R]
        </button>

        {/* 速度控制 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
          <span style={{ fontSize: '14px' }}>速度:</span>
          {[0.5, 1, 1.5, 2].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              style={{
                ...buttonStyle,
                backgroundColor: speed === s ? '#3b82f6' : '#f3f4f6',
                color: speed === s ? 'white' : '#374151',
                padding: '4px 8px',
                fontSize: '12px'
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* 进度条 */}
      <div style={{
        position: 'relative',
        height: '8px',
        backgroundColor: '#e5e7eb',
        borderRadius: '4px',
        cursor: 'pointer'
      }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#10b981',
            borderRadius: '4px',
            width: `${progress}%`,
            transition: 'width 0.3s'
          }}
        />
        <input
          type="range"
          min={0}
          max={totalSteps - 1}
          value={currentStep}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer'
          }}
        />
      </div>

      <div style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
        步骤 {currentStep + 1} / {totalSteps}
      </div>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  backgroundColor: '#f3f4f6',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  color: '#374151'
};
```

#### 4.10 微信交流群悬浮球 (src/components/WeChatFloat.tsx)
```typescript
import React, { useState } from 'react';

export const WeChatFloat: React.FC = () => {
  const [showQR, setShowQR] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 100
    }}>
      <button
        onMouseEnter={() => setShowQR(true)}
        onMouseLeave={() => setShowQR(false)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#07c160',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'transform 0.2s',
          transform: showQR ? 'scale(1.1)' : 'scale(1)'
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M8.5,13.5A1.5,1.5 0 1,0 7,12A1.5,1.5 0 0,0 8.5,13.5M14.5,13.5A1.5,1.5 0 1,0 13,12A1.5,1.5 0 0,0 14.5,13.5M12,2C6.48,2 2,5.58 2,10C2,12.21 3.08,14.21 4.88,15.61C4.69,16.57 4.09,18.65 4,19.26C3.96,19.57 4.23,19.84 4.54,19.76C5.5,19.52 7.5,18.77 8.34,18.3C9.46,18.76 10.7,19 12,19C17.52,19 22,15.42 22,11C22,6.58 17.52,2 12,2Z"/>
        </svg>
      </button>

      <div style={{
        fontSize: '12px',
        color: '#07c160',
        textAlign: 'center',
        marginTop: '4px',
        fontWeight: 500
      }}>
        交流群
      </div>

      {showQR && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          right: '0',
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          width: '200px'
        }}>
          <img
            src="/wechat-qr.png"
            alt="微信交流群二维码"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '8px'
            }}
          />
          <p style={{
            margin: '8px 0 0 0',
            fontSize: '12px',
            color: '#666',
            textAlign: 'center'
          }}>
            扫码发送"leetcode"加入算法交流群
          </p>
        </div>
      )}
    </div>
  );
};
```

### 第4.5步：多解法独立页面实现（如需要）

如果题目有**多种解法**，每种解法应该是**独立的页面**，只有输入部分是共享的。

#### 4.5.1 多解法切换组件 (src/components/SolutionSelector.tsx)

```typescript
import React from 'react';

interface Solution {
  id: string;
  name: string;
  description: string;
  timeComplexity: string;
  spaceComplexity: string;
}

interface SolutionSelectorProps {
  solutions: Solution[];
  currentSolution: string;
  onSolutionChange: (id: string) => void;
}

export const SolutionSelector: React.FC<SolutionSelectorProps> = ({
  solutions,
  currentSolution,
  onSolutionChange
}) => {
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '12px 20px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb'
    }}>
      <span style={{ fontWeight: 600, fontSize: '14px' }}>选择解法:</span>
      {solutions.map((sol) => (
        <button
          key={sol.id}
          onClick={() => onSolutionChange(sol.id)}
          style={{
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: currentSolution === sol.id ? '#3b82f6' : '#e5e7eb',
            color: currentSolution === sol.id ? 'white' : '#374151',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          title={`${sol.description}\n时间: ${sol.timeComplexity}\n空间: ${sol.spaceComplexity}`}
        >
          {sol.name}
        </button>
      ))}
    </div>
  );
};
```

#### 4.5.2 多解法 App.tsx 结构

```typescript
function App() {
  const [currentSolution, setCurrentSolution] = useState('brute-force');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 定义多种解法
  const solutions = {
    'brute-force': {
      name: '暴力解法',
      steps: BRUTE_FORCE_STEPS,
      codes: BRUTE_FORCE_CODES,
      algorithmType: 'array' as const
    },
    'hash-map': {
      name: '哈希表优化',
      steps: HASH_MAP_STEPS,
      codes: HASH_MAP_CODES,
      algorithmType: 'hash_map' as const
    }
  };

  const activeSolution = solutions[currentSolution];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header ... />
      <SolutionSelector
        solutions={Object.entries(solutions).map(([id, sol]) => ({
          id,
          name: sol.name,
          description: '',
          timeComplexity: '',
          spaceComplexity: ''
        }))}
        currentSolution={currentSolution}
        onSolutionChange={(id) => {
          setCurrentSolution(id);
          setCurrentStep(0); // 重置步骤
          setIsPlaying(false);
        }}
      />
      {/* 根据当前解法渲染不同的画布和代码 */}
      <Canvas
        steps={activeSolution.steps}
        currentStep={currentStep}
        data={data}
        algorithmType={activeSolution.algorithmType}
      />
      <CodePanel
        codes={activeSolution.codes}
        currentStep={currentStep}
        stepToLines={...}
      />
      <ControlPanel ... />
    </div>
  );
}
```

**关键原则**：
- 每种解法有**独立的 steps 定义**
- 每种解法有**独立的 codes 代码**
- 每种解法有**独立的 canvas 渲染逻辑**
- 切换解法时**重置播放状态**

### 第5步：实现画布系统

#### 5.1 主画布组件 (src/components/Canvas/index.tsx)
```typescript
import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { AlgorithmStep } from '../../types';

interface CanvasProps {
  steps: AlgorithmStep[];
  currentStep: number;
  data: any;
  algorithmType: 'array' | 'linked_list' | 'binary_tree' | 'graph' | 'other';
}

export const Canvas: React.FC<CanvasProps> = ({
  steps,
  currentStep,
  data,
  algorithmType
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 根据算法类型渲染不同的可视化
    switch (algorithmType) {
      case 'array':
        renderArray(svg, data, steps[currentStep], width, height);
        break;
      case 'binary_tree':
        renderBinaryTree(svg, data, steps[currentStep], width, height);
        break;
      case 'linked_list':
        renderLinkedList(svg, data, steps[currentStep], width, height);
        break;
      default:
        renderGeneric(svg, data, steps[currentStep], width, height);
    }
  }, [data, currentStep, algorithmType, zoom, pan]);

  // 拖拽和缩放处理
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = Math.max(0.5, Math.min(3, zoom + (e.deltaY > 0 ? -0.1 : 0.1)));
    setZoom(newZoom);
  };

  return (
    <div style={{
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#f9fafb',
      borderRadius: '8px'
    }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onWheel={handleWheel}
        style={{ cursor: 'grab' }}
      />
      
      {/* 缩放控制 */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={() => setZoom(z => Math.min(3, z + 0.2))}
          style={zoomButtonStyle}
        >
          +
        </button>
        <span style={{ padding: '4px 8px', backgroundColor: 'white', borderRadius: '4px' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
          style={zoomButtonStyle}
        >
          -
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          style={zoomButtonStyle}
        >
          ⟲
        </button>
      </div>
    </div>
  );
};

// 渲染函数（简化版，实际实现需要更详细的逻辑）
function renderArray(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, data: any, step: AlgorithmStep, width: number, height: number) {
  // 数组渲染逻辑
  const g = svg.append('g');
  // ... 实现数组可视化
}

function renderBinaryTree(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, data: any, step: AlgorithmStep, width: number, height: number) {
  // 二叉树渲染逻辑
  const g = svg.append('g');
  // ... 实现二叉树可视化
}

function renderLinkedList(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, data: any, step: AlgorithmStep, width: number, height: number) {
  // 链表渲染逻辑
  const g = svg.append('g');
  // ... 实现链表可视化
}

function renderGeneric(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, data: any, step: AlgorithmStep, width: number, height: number) {
  // 通用渲染逻辑
  const g = svg.append('g');
  // ... 实现通用可视化
}

const zoomButtonStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  backgroundColor: 'white',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
```

### 第5.5步：动画分镜系统设计

#### 分镜设计原则

**原子级步骤拆解**：
每个代码行对应 1-3 个动画镜头，例如：
```typescript
// 代码行
if (nums[i] + nums[j] == target) {

// 拆解为 3 个镜头：
const steps = [
  {
    id: 1,
    description: '高亮 nums[i] 和 nums[j]',
    codeLines: { java: [3], python: [3], go: [3], javascript: [3] },
    highlightElements: ['array-i', 'array-j'],
    annotations: [
      { target: 'array-i', text: 'i = 0, val = 2', position: 'top' },
      { target: 'array-j', text: 'j = 1, val = 7', position: 'top' }
    ]
  },
  {
    id: 2,
    description: '显示比较动画',
    codeLines: { java: [3], python: [3], go: [3], javascript: [3] },
    highlightElements: ['operator-plus', 'comparison'],
    annotations: [
      { target: 'comparison', text: '2 + 7 = 9', position: 'top' }
    ]
  },
  {
    id: 3,
    description: '条件为真，返回结果',
    codeLines: { java: [4], python: [4], go: [4], javascript: [4] },
    highlightElements: ['return-result'],
    annotations: [
      { target: 'return-result', text: '返回 [0, 1]', position: 'right' }
    ],
    dataFlow: {
      from: 'array-i',
      to: 'result',
      label: 'i = 0'
    }
  }
];
```

#### 信息密度设计

**画布应该展示的信息**（按优先级）：

1. **核心数据状态**
   - 数组/链表的当前元素值
   - 指针位置（i, j, left, right, fast, slow 等）
   - 当前操作的元素高亮

2. **状态变更标注**
   - 元素值变化（旧值 → 新值）
   - 指针移动轨迹
   - 访问状态（已访问/未访问）

3. **数据流动画**
   - 箭头指向表示数据传递方向
   - 粒子流动画表示值拷贝
   - 标签说明传递的值

4. **辅助数据结构**
   - 栈：显示入栈/出栈过程
   - 队列：显示入队/出队过程
   - 哈希表：显示 key-value 对和冲突链

#### 可视化元素命名规范

```typescript
// 指针命名
const POINTER_NAMES = {
  left: 'L',           // 左指针
  right: 'R',          // 右指针
  fast: 'fast',        // 快指针
  slow: 'slow',        // 慢指针
  i: 'i',              // 数组索引
  j: 'j',              // 数组索引
  start: 'start',      // 起始指针
  end: 'end',          // 结束指针
  mid: 'mid',          // 中间指针
  prev: 'prev',        // 前一个
  curr: 'curr',        // 当前
  next: 'next'         // 下一个
};

// 状态标签
const STATE_LABELS = {
  recursive: '[递归中]',
  visited: '[已访问]',
  queued: '[队列中]',
  comparing: '[比较中]',
  swapping: '[交换中]'
};
```

#### 数据结构可视化详情

**二叉树渲染要求**：
- 节点：圆形+内部值
- 空节点：虚线框+灰色"null"标识
- 递归进入：从父节点到子节点的箭头，标注"递归进入"
- 递归退出：从子节点返回父节点的箭头，标注"返回值: xxx"
- 参数传递：箭头标注参数值

**链表渲染要求**：
- 节点：矩形+值+指针区域
- 指针：带箭头的线，标注 prev/next
- 空指针：明确标识 null
- 指针变更：显示旧指针消失，新指针出现的动画

**数组渲染要求**：
- 元素：矩形格子，内部显示值和索引
- 指针：在元素上方或下方显示指针标签（i, j, L, R等）
- 比较：两个元素之间显示比较符号和结果
- 交换：显示交换动画，带轨迹线

**哈希表渲染要求**：
- 键值对：卡片形式，key 和 value 分开显示
- 冲突链：用连线展示冲突的节点链
- 哈希函数：可选显示计算过程

### 第6步：配置部署

#### 6.1 GitHub Actions (.github/workflows/deploy.yml)
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint || true

      - name: Type check
        run: npm run type-check || npx tsc --noEmit

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### 6.2 .gitignore
```
# Dependencies
node_modules
.pnp
.pnp.js

# Build
dist
dist-ssr
*.local

# Editor
.vscode/*
!.vscode/extensions.json
.idea
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS
.DS_Store
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### 第7步：创建README.md

```markdown
# LeetCode {题号}. {中文标题} - 算法可视化

交互式算法演示网站，帮助理解解题思路。

🔗 [在线演示](https://{用户名}.github.io/leetcode-{题号}-{slug}-visualization/)

🔗 [LeetCode原题](https://leetcode.cn/problems/{slug}/)

## 功能特性

- 🎬 分步骤动画演示
- 💻 多语言代码展示（Java/Python/Go/JavaScript）
- 🎮 播放控制（播放/暂停/步进/进度条）
- 📊 数据结构可视化
- ⌨️ 键盘快捷键支持

## 本地开发

```bash
npm install
npm run dev
```

## 构建部署

推送到main分支自动触发GitHub Actions部署。
```

### 第8步：下载微信群二维码

下载二维码图片到 public/wechat-qr.png：
```bash
curl -L -o public/wechat-qr.png "https://camo.githubusercontent.com/8da8cd61e3f9da0574b58bab96daeddcfbbecde5e4da9478c256f6a710749aa5/68747470733a2f2f63646e2e6a7364656c6976722e6e65742f67682f4a535245492f2e6769746875622f70726f66696c652f524541444d452e6173736574732f696d6167652d32303233313033303133323032363534312d373631343036352e706e67"
```

## 测试验收清单

- [ ] 页面标题正确显示（题号+中文标题）
- [ ] 标题可点击跳转到LeetCode
- [ ] 返回链接正常工作
- [ ] GitHub徽标显示正确
- [ ] Star数获取正常（API+缓存）
- [ ] 算法思路弹窗正常
- [ ] 数据输入组件工作正常
- [ ] 代码展示面板工作正常
- [ ] 四语言切换正常
- [ ] 当前执行行高亮
- [ ] 变量值展示正确
- [ ] 画布渲染正常
- [ ] 拖拽和缩放正常
- [ ] 动画流畅（>30fps）
- [ ] 播放控制面板正常
- [ ] 键盘快捷键生效
- [ ] 进度条可拖拽
- [ ] 速度调节正常
- [ ] 用户偏好记忆正常
- [ ] 微信群悬浮球正常
- [ ] 无紫色配色
- [ ] 单屏幕无滚动条

### 第9步：Playwright MCP 测试验收

在开发完成后，使用 Playwright MCP 对每个功能点进行详细测试。

#### 9.1 启动开发服务器

```bash
npm run dev
```

确保服务运行在随机端口（30000-65535）。

#### 9.2 使用 Playwright MCP 测试

**测试页面标题和导航：**
```typescript
// 测试标题显示
await page.goto('http://localhost:{port}');
await expect(page.locator('header h1')).toContainText('LeetCode {题号}. {中文标题}');

// 测试标题链接
await page.click('header h1 a');
await expect(page).toHaveURL('https://leetcode.cn/problems/{slug}/');

// 测试返回链接
await page.goto('http://localhost:{port}');
await page.click('text=返回 LeetCode Hot 100');
await expect(page).toHaveURL('https://fuck-algorithm.github.io/leetcode-hot-100/');
```

**测试 GitHub 徽标：**
```typescript
// 测试徽标显示
await expect(page.locator('a[title*="GitHub"]')).toBeVisible();

// 测试悬停提示
await page.hover('a[title*="GitHub"]');
await expect(page.locator('text=去GitHub仓库Star支持一下')).toBeVisible();

// 测试 Star 数（可能需要等待 API 响应）
await page.waitForTimeout(2000);
const starText = await page.locator('a[title*="GitHub"] span').textContent();
expect(starText).toMatch(/⭐ \d+/);
```

**测试算法思路弹窗：**
```typescript
await page.click('text=💡 算法思路');
await expect(page.locator('.modal')).toContainText('解题思路');
await page.click('.modal button:has-text("×")');
await expect(page.locator('.modal')).not.toBeVisible();
```

**测试数据输入：**
```typescript
// 测试自定义输入
await page.fill('input[placeholder="输入自定义数据"]', '[2,7,11,15]');
await expect(page.locator('text=Invalid input')).not.toBeVisible();

// 测试样例选择
await page.click('text=样例 1');
const inputValue = await page.locator('input').inputValue();
expect(inputValue).toBeTruthy();

// 测试随机生成
await page.click('text=🎲 随机');
const randomValue = await page.locator('input').inputValue();
expect(randomValue).toBeTruthy();
```

**测试代码展示：**
```typescript
// 测试四语言切换
await page.click('text=Python');
await expect(page.locator('code')).toContainText('def');
await page.click('text=Java');
await expect(page.locator('code')).toContainText('class');

// 测试代码高亮和行号
await expect(page.locator('.line-number')).toHaveCount({大于0});
```

**测试画布：**
```typescript
// 测试画布渲染
await expect(page.locator('svg')).toBeVisible();

// 测试缩放
await page.click('text=+');
await page.click('text=-');
await page.click('text=⟲');
```

**测试播放控制：**
```typescript
// 测试按钮
await page.click('text=▶ 播放');
await page.waitForTimeout(500);
await page.click('text=⏸ 暂停');
await page.click('text=下一步 →');
await page.click('text=← 上一步');
await page.click('text=↺ 重置');

// 测试键盘快捷键
await page.keyboard.press(' '); // 播放/暂停
await page.keyboard.press('ArrowRight'); // 下一步
await page.keyboard.press('ArrowLeft'); // 上一步
await page.keyboard.press('r'); // 重置

// 测试进度条拖拽
const progressBar = page.locator('input[type="range"]');
await progressBar.fill('5');
await expect(page.locator('text=步骤 6 /')).toBeVisible();

// 测试速度调节
await page.click('text=2x');
```

**测试微信群悬浮球：**
```typescript
await page.hover('text=交流群');
await expect(page.locator('img[alt="微信交流群二维码"]')).toBeVisible();
```

**测试多解法切换（如果有）：**
```typescript
await page.click('text=哈希表优化');
await expect(page.locator('canvas')).toHaveAttribute('data-solution', 'hash-map');
```

#### 9.3 性能测试

```typescript
// 测试动画帧率
const fps = await page.evaluate(() => {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const count = () => {
      frames++;
      if (performance.now() - start < 1000) {
        requestAnimationFrame(count);
      } else {
        resolve(frames);
      }
    };
    requestAnimationFrame(count);
  });
});
expect(fps).toBeGreaterThan(30);
```

#### 9.4 提交前的最终检查

在提交代码前，确保：

```bash
# 1. 检查编译错误
npm run type-check

# 2. 检查 lint 错误
npm run lint

# 3. 构建测试
npm run build

# 4. 检查无紫色配色（手动检查生成的 CSS）
```

## 注意事项

1. **端口设置**：vite.config.ts中使用随机端口（30000-65535）
2. **GitHub仓库**：确保github_repo变量正确设置
3. **动画步骤**：精心设计步骤与代码行的绑定
4. **数据验证**：自定义输入需要严格的合法性校验
5. **缓存策略**：Star数1小时缓存，用户偏好永久缓存
6. **配色禁忌**：严禁使用任何紫色系配色
7. **提交规范**：
   - 每次提交前检查编译错误和lint错误
   - 尽量分为多次提交，多产生commit个数
   - 完善.gitignore，不要把node_modules提交到仓库
8. **数据结构可视化**：
   - 栈：需要显示入栈/出栈动画，箭头指向
   - 队列：需要显示入队/出队动画，箭头指向
   - 哈希表：需要清晰显示key-value对，处理哈希冲突链
   - 二叉树：需要显示空节点（null），递归进入/退出标注
9. **多解法实现**：每种解法应该有独立的代码、画布、步骤定义，通过切换按钮切换

## 参考文档

- [Windsurf](https://windsurf.com/)
- [D3.js](https://d3js.org/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
