#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Marked } from 'marked';

const __dirname = dirname(fileURLToPath(import.meta.url));
const blogDir = join(__dirname, '..', 'blog');
const outDir = join(__dirname);

const marked = new Marked();

// ─── Article metadata ───────────────────────────────────────────────────────
const articles = [
  { id: '01', file: '01-your-ai-forgets-everything.md', theme: 'terminal', accent: '#00ff41', tagline: 'The context problem nobody talks about' },
  { id: '02', file: '02-getting-started-in-5-minutes.md', theme: 'minimal', accent: '#6366f1', tagline: 'Zero to documented in minutes' },
  { id: '03', file: '03-anatomy-of-generated-docs.md', theme: 'blueprint', accent: '#64b5f6', tagline: 'Inside .sum files and AGENTS.md' },
  { id: '04', file: '04-two-phase-pipeline.md', theme: 'cyberpunk', accent: '#ff2d95', tagline: 'How ARE understands your codebase' },
  { id: '05', file: '05-incremental-updates.md', theme: 'nature', accent: '#4a7c59', tagline: 'Keep docs fresh effortlessly' },
  { id: '06', file: '06-multi-runtime-support.md', theme: 'glass', accent: '#a78bfa', tagline: 'One tool, every AI runtime' },
  { id: '07', file: '07-configuration-mastery.md', theme: 'newspaper', accent: '#8b0000', tagline: 'Tuning ARE for your project' },
  { id: '08', file: '08-from-docs-to-specs.md', theme: 'brutalist', accent: '#ff0000', tagline: 'Transform docs into specifications' },
  { id: '09', file: '09-rebuilding-from-specs.md', theme: 'synthwave', accent: '#f472b6', tagline: 'Code reconstruction from specs' },
  { id: '10', file: '10-tips-for-best-docs.md', theme: 'notebook', accent: '#e74c3c', tagline: '10 tips for better results' },
  { id: '11', file: '11-quality-gates-debugging.md', theme: 'swiss', accent: '#ff0000', tagline: 'Built-in validation and debugging' },
  { id: '12', file: '12-team-workflow-integration.md', theme: 'material', accent: '#1976d2', tagline: 'CI/CD, hooks, and automation' },
];

// ─── Extract title from markdown ─────────────────────────────────────────────
function extractTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1] : 'Untitled';
}

// ─── Common head ─────────────────────────────────────────────────────────────
function commonHead(title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — ARE Blog</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`;
}

// ─── Navigation bar ──────────────────────────────────────────────────────────
function nav(currentId, theme) {
  const idx = articles.findIndex(a => a.id === currentId);
  const prev = idx > 0 ? articles[idx - 1] : null;
  const next = idx < articles.length - 1 ? articles[idx + 1] : null;
  const isDark = ['terminal','cyberpunk','synthwave','blueprint','glass'].includes(theme);
  const fg = isDark ? '#fff' : '#333';
  const bg = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.95)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const btnBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const btnHover = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)';
  const btnBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const tipBg = isDark ? '#111' : '#333';

  const prevTitle = prev ? extractTitle(readFileSync(join(blogDir, prev.file), 'utf-8')).replace(/"/g, '&quot;') : '';
  const nextTitle = next ? extractTitle(readFileSync(join(blogDir, next.file), 'utf-8')).replace(/"/g, '&quot;') : '';

  return `<style>
.are-nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;padding:10px 20px;background:${bg};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid ${border};font-family:system-ui,-apple-system,sans-serif}
.are-nav-side{flex:1;min-width:0}
.are-nav-center{display:flex;align-items:center;gap:6px}
.are-nav-btn{display:inline-flex;align-items:center;padding:6px 14px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:500;color:${fg};background:${btnBg};border:1px solid ${btnBorder};transition:background 0.15s;position:relative;cursor:pointer;white-space:nowrap}
.are-nav-btn:hover{background:${btnHover}}
.are-nav-btn.is-disabled{opacity:0.25;pointer-events:none}
.are-nav-count{color:${fg};opacity:0.5;font-size:12px;font-weight:500;padding:0 6px;font-family:system-ui,sans-serif}
.are-nav-btn[data-tip]:hover::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);padding:5px 10px;border-radius:6px;font-size:11px;font-weight:400;white-space:nowrap;background:${tipBg};color:#fff;pointer-events:none;z-index:200;box-shadow:0 2px 8px rgba(0,0,0,0.25)}
.are-nav-btn[data-tip]:hover::before{content:'';position:absolute;top:calc(100% + 2px);left:50%;transform:translateX(-50%);border:5px solid transparent;border-bottom-color:${tipBg};pointer-events:none;z-index:200}
</style>
<nav class="are-nav">
  <div class="are-nav-side"><a href="index.html" class="are-nav-btn">← All Articles</a></div>
  <div class="are-nav-center">
    ${prev ? `<a href="${prev.id}.html" class="are-nav-btn" data-tip="${prevTitle}">← Prev</a>` : '<span class="are-nav-btn is-disabled">← Prev</span>'}
    <span class="are-nav-count">${currentId} / ${articles.length}</span>
    ${next ? `<a href="${next.id}.html" class="are-nav-btn" data-tip="${nextTitle}">Next →</a>` : '<span class="are-nav-btn is-disabled">Next →</span>'}
  </div>
  <div class="are-nav-side"></div>
</nav>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THEMES
// ═══════════════════════════════════════════════════════════════════════════════

const themes = {

// ── 01: Terminal ─────────────────────────────────────────────────────────────
terminal: () => `
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&display=swap" rel="stylesheet">
<style>
  @keyframes blink { 0%,49%{opacity:1}50%,100%{opacity:0} }
  @keyframes scanline { 0%{top:-100%}100%{top:100%} }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #0a0a0a;
    color: #00ff41;
    font-family: 'Fira Code', 'Courier New', monospace;
    font-size: 15px;
    line-height: 1.8;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }
  body::before {
    content: '';
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(
      0deg, transparent, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px
    );
    pointer-events: none;
    z-index: 1000;
  }
  body::after {
    content: '';
    position: fixed;
    width: 100%;
    height: 200%;
    top: -100%;
    left: 0;
    background: linear-gradient(transparent 50%, rgba(0,255,65,0.02) 50%);
    background-size: 100% 4px;
    animation: scanline 8s linear infinite;
    pointer-events: none;
    z-index: 1001;
  }
  article {
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }
  h1 {
    font-size: 28px;
    color: #00ff41;
    text-shadow: 0 0 20px rgba(0,255,65,0.5);
    margin-bottom: 8px;
  }
  h1::before { content: '> '; opacity: 0.5; }
  h1::after {
    content: '█';
    animation: blink 1s step-end infinite;
    margin-left: 4px;
  }
  h2 {
    font-size: 20px;
    color: #39ff14;
    margin: 32px 0 16px;
    border-bottom: 1px solid #1a3a1a;
    padding-bottom: 8px;
  }
  h2::before { content: '## '; opacity: 0.4; }
  h3 { font-size: 17px; color: #7fff7f; margin: 24px 0 12px; }
  h3::before { content: '### '; opacity: 0.4; }
  p { margin: 12px 0; }
  a { color: #5eff5e; text-decoration: underline; }
  a:hover { text-shadow: 0 0 8px rgba(0,255,65,0.8); }
  code {
    background: #0d1a0d;
    border: 1px solid #1a3a1a;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 14px;
  }
  pre {
    background: #0d1a0d;
    border: 1px solid #1a3a1a;
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 16px 0;
    box-shadow: 0 0 15px rgba(0,255,65,0.1);
  }
  pre code { background: none; border: none; padding: 0; }
  ul, ol { padding-left: 24px; margin: 12px 0; }
  li { margin: 6px 0; }
  li::marker { color: #39ff14; }
  strong { color: #7fff7f; font-weight: 600; }
  em { color: #5eff5e; }
  hr { border: none; border-top: 1px dashed #1a3a1a; margin: 24px 0; }
  blockquote {
    border-left: 3px solid #00ff41;
    padding: 8px 16px;
    margin: 16px 0;
    background: rgba(0,255,65,0.05);
  }
</style>`,

// ── 02: Minimal Startup ─────────────────────────────────────────────────────
minimal: () => `
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #ffffff;
    color: #1a1a2e;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 17px;
    line-height: 1.75;
  }
  article {
    max-width: 680px;
    margin: 0 auto;
    padding: 60px 24px 100px;
  }
  h1 {
    font-size: 42px;
    font-weight: 700;
    letter-spacing: -1.5px;
    line-height: 1.15;
    color: #0f0f23;
    margin-bottom: 12px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  h2 {
    font-size: 26px;
    font-weight: 600;
    color: #1a1a2e;
    margin: 48px 0 16px;
    letter-spacing: -0.5px;
  }
  h3 {
    font-size: 20px;
    font-weight: 600;
    color: #374151;
    margin: 32px 0 12px;
  }
  p { margin: 16px 0; color: #4b5563; }
  a { color: #6366f1; text-decoration: none; border-bottom: 1px solid #c7d2fe; transition: border-color 0.2s; }
  a:hover { border-color: #6366f1; }
  code {
    background: #f3f4f6;
    color: #6366f1;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 15px;
    font-family: 'Fira Code', monospace;
  }
  pre {
    background: #f8f9fb;
    border: 1px solid #e5e7eb;
    padding: 20px;
    border-radius: 12px;
    overflow-x: auto;
    margin: 20px 0;
  }
  pre code { background: none; padding: 0; color: #374151; }
  ul, ol { padding-left: 24px; margin: 16px 0; color: #4b5563; }
  li { margin: 8px 0; }
  strong { color: #1a1a2e; font-weight: 600; }
  hr { border: none; height: 1px; background: #e5e7eb; margin: 40px 0; }
  blockquote {
    border-left: 4px solid #6366f1;
    padding: 12px 20px;
    margin: 20px 0;
    background: #f5f3ff;
    border-radius: 0 8px 8px 0;
    color: #4b5563;
  }
</style>`,

// ── 03: Blueprint ────────────────────────────────────────────────────────────
blueprint: () => `
<link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;600&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #0d2137;
    background-image:
      linear-gradient(rgba(100,181,246,0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(100,181,246,0.07) 1px, transparent 1px);
    background-size: 24px 24px;
    color: #c5e1f5;
    font-family: 'Roboto', sans-serif;
    font-size: 16px;
    line-height: 1.7;
    min-height: 100vh;
  }
  article {
    max-width: 740px;
    margin: 0 auto;
    padding: 50px 24px 80px;
  }
  h1 {
    font-family: 'Roboto Mono', monospace;
    font-size: 30px;
    color: #e3f2fd;
    text-transform: uppercase;
    letter-spacing: 3px;
    border: 2px solid #2196f3;
    padding: 20px;
    margin-bottom: 24px;
    text-align: center;
    position: relative;
  }
  h1::before {
    content: 'BLUEPRINT';
    position: absolute;
    top: -10px;
    left: 20px;
    background: #0d2137;
    padding: 0 10px;
    font-size: 11px;
    color: #64b5f6;
    letter-spacing: 4px;
  }
  h2 {
    font-family: 'Roboto Mono', monospace;
    font-size: 18px;
    color: #90caf9;
    margin: 36px 0 14px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(33,150,243,0.3);
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  h3 {
    font-size: 16px;
    color: #64b5f6;
    margin: 28px 0 10px;
    font-family: 'Roboto Mono', monospace;
  }
  p { margin: 12px 0; }
  a { color: #64b5f6; text-decoration: none; border-bottom: 1px dashed #64b5f6; }
  a:hover { color: #e3f2fd; }
  code {
    background: rgba(33,150,243,0.15);
    border: 1px solid rgba(33,150,243,0.3);
    padding: 2px 6px;
    border-radius: 2px;
    font-family: 'Roboto Mono', monospace;
    font-size: 14px;
    color: #90caf9;
  }
  pre {
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(33,150,243,0.3);
    padding: 18px;
    border-radius: 2px;
    overflow-x: auto;
    margin: 16px 0;
  }
  pre code { background: none; border: none; padding: 0; color: #b3e5fc; }
  ul, ol { padding-left: 24px; margin: 12px 0; }
  li { margin: 6px 0; }
  li::marker { color: #2196f3; }
  strong { color: #e3f2fd; }
  hr { border: none; border-top: 1px dashed rgba(33,150,243,0.4); margin: 28px 0; }
  blockquote {
    border-left: 3px solid #2196f3;
    padding: 10px 18px;
    margin: 16px 0;
    background: rgba(33,150,243,0.08);
    font-style: italic;
  }
</style>`,

// ── 04: Cyberpunk ────────────────────────────────────────────────────────────
cyberpunk: () => `
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;600&display=swap" rel="stylesheet">
<style>
  @keyframes glitch {
    0%,100% { text-shadow: 2px 0 #ff2d95, -2px 0 #0ff; }
    25% { text-shadow: -2px -1px #ff2d95, 2px 1px #0ff; }
    50% { text-shadow: 1px 2px #ff2d95, -1px -2px #0ff; }
    75% { text-shadow: -1px 1px #ff2d95, 1px -1px #0ff; }
  }
  @keyframes neonPulse { 0%,100%{opacity:1}50%{opacity:0.7} }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #0d0221;
    background-image: radial-gradient(ellipse at 50% 0%, rgba(255,45,149,0.1) 0%, transparent 60%);
    color: #e0d6ff;
    font-family: 'Rajdhani', sans-serif;
    font-size: 17px;
    line-height: 1.7;
    min-height: 100vh;
  }
  article {
    max-width: 760px;
    margin: 0 auto;
    padding: 50px 24px 80px;
  }
  h1 {
    font-family: 'Orbitron', sans-serif;
    font-size: 34px;
    font-weight: 900;
    color: #fff;
    text-transform: uppercase;
    animation: glitch 3s infinite;
    margin-bottom: 12px;
    letter-spacing: 2px;
  }
  h2 {
    font-family: 'Orbitron', sans-serif;
    font-size: 20px;
    color: #0ff;
    margin: 40px 0 16px;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-left: 4px solid #ff2d95;
    padding-left: 16px;
  }
  h3 {
    font-size: 18px;
    color: #ff2d95;
    margin: 28px 0 12px;
    font-family: 'Orbitron', sans-serif;
    font-weight: 500;
  }
  p { margin: 12px 0; }
  a { color: #0ff; text-decoration: none; border-bottom: 1px solid rgba(0,255,255,0.4); }
  a:hover { text-shadow: 0 0 10px rgba(0,255,255,0.8); }
  code {
    background: rgba(255,45,149,0.15);
    border: 1px solid rgba(255,45,149,0.3);
    padding: 2px 8px;
    border-radius: 3px;
    color: #ff79c6;
    font-family: 'Fira Code', monospace;
    font-size: 15px;
  }
  pre {
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(0,255,255,0.2);
    padding: 18px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 16px 0;
    box-shadow: 0 0 20px rgba(0,255,255,0.05), inset 0 0 20px rgba(255,45,149,0.05);
  }
  pre code { background: none; border: none; color: #0ff; padding: 0; }
  ul, ol { padding-left: 24px; margin: 12px 0; }
  li { margin: 6px 0; }
  li::marker { color: #ff2d95; }
  strong { color: #fff; font-weight: 600; }
  em { color: #0ff; }
  hr { border: none; height: 2px; background: linear-gradient(90deg, #ff2d95, #0ff, #ff2d95); margin: 32px 0; animation: neonPulse 2s ease-in-out infinite; }
  blockquote {
    border-left: 3px solid #0ff;
    padding: 10px 18px;
    margin: 16px 0;
    background: rgba(0,255,255,0.05);
  }
</style>`,

// ── 05: Nature/Organic ──────────────────────────────────────────────────────
nature: () => `
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #f5f0e8;
    background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a89060' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    color: #3d3229;
    font-family: 'Lora', Georgia, serif;
    font-size: 17px;
    line-height: 1.8;
  }
  article {
    max-width: 700px;
    margin: 0 auto;
    padding: 50px 24px 80px;
  }
  h1 {
    font-size: 36px;
    font-weight: 600;
    color: #2d5016;
    margin-bottom: 16px;
    line-height: 1.25;
  }
  h1::first-letter {
    font-size: 52px;
    float: left;
    margin-right: 8px;
    line-height: 1;
    color: #4a7c59;
  }
  h2 {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 22px;
    color: #4a7c59;
    margin: 40px 0 14px;
    padding-bottom: 8px;
    border-bottom: 2px solid #c5d8b0;
  }
  h3 {
    font-size: 18px;
    color: #5a8a5a;
    margin: 28px 0 10px;
  }
  p { margin: 14px 0; }
  a { color: #4a7c59; text-decoration: none; border-bottom: 1px solid #9bb88d; }
  a:hover { color: #2d5016; border-color: #4a7c59; }
  code {
    background: #e8e0d0;
    border: 1px solid #d4c8b0;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 15px;
    color: #5a4a38;
  }
  pre {
    background: #ede7db;
    border: 1px solid #d4c8b0;
    padding: 18px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 18px 0;
  }
  pre code { background: none; border: none; padding: 0; }
  ul, ol { padding-left: 24px; margin: 14px 0; }
  li { margin: 8px 0; }
  li::marker { color: #4a7c59; }
  strong { color: #2d5016; }
  em { color: #5a8a5a; }
  hr { border: none; height: 3px; background: linear-gradient(90deg, transparent, #c5d8b0, transparent); margin: 32px 0; }
  blockquote {
    border-left: 4px solid #4a7c59;
    padding: 10px 18px;
    margin: 18px 0;
    background: rgba(74,124,89,0.06);
    font-style: italic;
  }
</style>`,

// ── 06: Glassmorphism ────────────────────────────────────────────────────────
glass: () => `
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @keyframes float1 { 0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-40px)} }
  @keyframes float2 { 0%,100%{transform:translate(0,0)}50%{transform:translate(-40px,30px)} }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: linear-gradient(135deg, #1a0533 0%, #0f172a 30%, #1e1b4b 60%, #0c1e3a 100%);
    color: #e2e8f0;
    font-family: 'Poppins', sans-serif;
    font-size: 16px;
    line-height: 1.75;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }
  .blob {
    position: fixed;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4;
    pointer-events: none;
    z-index: 0;
  }
  .blob-1 { width:400px;height:400px;background:#7c3aed;top:-100px;right:-100px;animation:float1 15s ease-in-out infinite; }
  .blob-2 { width:350px;height:350px;background:#2563eb;bottom:-50px;left:-100px;animation:float2 18s ease-in-out infinite; }
  .blob-3 { width:300px;height:300px;background:#db2777;top:50%;left:50%;animation:float1 20s ease-in-out infinite reverse; }
  article {
    position: relative;
    z-index: 1;
    max-width: 720px;
    margin: 0 auto;
    padding: 50px 24px 80px;
  }
  .glass-card {
    background: rgba(255,255,255,0.07);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    padding: 32px;
    margin: 24px 0;
  }
  h1 {
    font-size: 34px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 12px;
    background: linear-gradient(135deg, #a78bfa, #818cf8, #60a5fa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  h2 {
    font-size: 22px;
    font-weight: 600;
    color: #c4b5fd;
    margin: 36px 0 14px;
  }
  h3 {
    font-size: 18px;
    color: #a78bfa;
    margin: 24px 0 10px;
    font-weight: 500;
  }
  p { margin: 12px 0; }
  a { color: #818cf8; text-decoration: none; transition: color 0.2s; }
  a:hover { color: #c4b5fd; }
  code {
    background: rgba(167,139,250,0.15);
    border: 1px solid rgba(167,139,250,0.2);
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 14px;
    color: #c4b5fd;
  }
  pre {
    background: rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.08);
    padding: 20px;
    border-radius: 12px;
    overflow-x: auto;
    margin: 16px 0;
  }
  pre code { background: none; border: none; padding: 0; color: #e2e8f0; }
  ul, ol { padding-left: 24px; margin: 12px 0; }
  li { margin: 6px 0; }
  li::marker { color: #a78bfa; }
  strong { color: #fff; }
  hr { border: none; height: 1px; background: linear-gradient(90deg, transparent, rgba(167,139,250,0.4), transparent); margin: 28px 0; }
  blockquote {
    background: rgba(167,139,250,0.08);
    border-left: 3px solid #a78bfa;
    padding: 12px 18px;
    border-radius: 0 10px 10px 0;
    margin: 16px 0;
  }
</style>`,

// ── 07: Newspaper ────────────────────────────────────────────────────────────
newspaper: () => `
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Libre+Franklin:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #f4f1ea;
    color: #2c2c2c;
    font-family: 'Source Serif 4', Georgia, serif;
    font-size: 17px;
    line-height: 1.7;
  }
  article {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }
  .masthead {
    text-align: center;
    border-bottom: 4px double #2c2c2c;
    padding-bottom: 16px;
    margin-bottom: 32px;
  }
  .masthead .paper-name {
    font-family: 'Playfair Display', serif;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 8px;
    color: #666;
    margin-bottom: 8px;
  }
  h1 {
    font-family: 'Playfair Display', serif;
    font-size: 38px;
    font-weight: 900;
    line-height: 1.15;
    text-align: center;
    margin-bottom: 16px;
    color: #1a1a1a;
  }
  h2 {
    font-family: 'Libre Franklin', sans-serif;
    font-size: 20px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #444;
    margin: 36px 0 14px;
    padding-bottom: 8px;
    border-bottom: 1px solid #ccc;
  }
  h3 {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 700;
    font-style: italic;
    color: #333;
    margin: 28px 0 10px;
  }
  p { margin: 12px 0; text-align: justify; }
  p:first-of-type::first-letter {
    font-family: 'Playfair Display', serif;
    font-size: 56px;
    float: left;
    line-height: 1;
    margin: 0 10px 0 0;
    color: #8b0000;
    font-weight: 900;
  }
  a { color: #8b0000; text-decoration: none; border-bottom: 1px solid #cba; }
  a:hover { color: #5c0000; }
  code {
    background: #ece8df;
    padding: 2px 6px;
    border-radius: 2px;
    font-size: 15px;
    color: #555;
  }
  pre {
    background: #ece8df;
    border-top: 1px solid #ccc;
    border-bottom: 1px solid #ccc;
    padding: 16px;
    overflow-x: auto;
    margin: 18px 0;
    font-size: 14px;
  }
  pre code { background: none; padding: 0; }
  ul, ol { padding-left: 24px; margin: 12px 0; }
  li { margin: 6px 0; }
  strong { font-weight: 600; }
  hr {
    border: none;
    border-top: 1px solid #aaa;
    margin: 28px auto;
    width: 40%;
  }
  hr::after { content: '§'; display: block; text-align: center; margin-top: -12px; color: #999; font-size: 14px; }
  blockquote {
    border-left: 3px solid #8b0000;
    padding: 10px 18px;
    margin: 16px 0;
    font-style: italic;
    color: #555;
  }
</style>`,

// ── 08: Brutalist ────────────────────────────────────────────────────────────
brutalist: () => `
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #fff;
    color: #000;
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 16px;
    line-height: 1.6;
  }
  article {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }
  h1 {
    font-size: 48px;
    font-weight: 700;
    line-height: 1.05;
    text-transform: uppercase;
    border: 4px solid #000;
    padding: 24px;
    margin-bottom: 24px;
    background: #ff0;
    color: #000;
  }
  h2 {
    font-size: 24px;
    font-weight: 700;
    text-transform: uppercase;
    margin: 40px 0 16px;
    padding: 8px 12px;
    background: #000;
    color: #fff;
    display: inline-block;
  }
  h3 {
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
    margin: 28px 0 10px;
    border-bottom: 3px solid #ff0000;
    padding-bottom: 4px;
    display: inline-block;
  }
  p { margin: 14px 0; }
  a { color: #000; text-decoration: none; border-bottom: 3px solid #ff0000; }
  a:hover { background: #ff0000; color: #fff; }
  code {
    background: #eee;
    border: 2px solid #000;
    padding: 2px 6px;
    font-size: 15px;
  }
  pre {
    background: #000;
    color: #0f0;
    border: 4px solid #000;
    padding: 18px;
    overflow-x: auto;
    margin: 18px 0;
  }
  pre code { background: none; border: none; color: #0f0; padding: 0; }
  ul, ol { padding-left: 24px; margin: 14px 0; }
  li { margin: 8px 0; }
  li::marker { color: #ff0000; font-weight: 700; }
  strong { text-decoration: underline; text-decoration-color: #ff0000; text-decoration-thickness: 3px; }
  hr { border: none; border-top: 4px solid #000; margin: 32px 0; }
  blockquote {
    border: 3px solid #000;
    border-left-width: 8px;
    padding: 14px 18px;
    margin: 18px 0;
    background: #f0f0f0;
    font-weight: 700;
  }
</style>`,

// ── 09: Synthwave ────────────────────────────────────────────────────────────
synthwave: () => `
<link href="https://fonts.googleapis.com/css2?family=Audiowide&family=Exo+2:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #1a0533;
    background-image:
      linear-gradient(180deg, #1a0533 0%, #0f0326 40%, #1a0533 60%, #2d0a4e 100%);
    color: #e8d5f5;
    font-family: 'Exo 2', sans-serif;
    font-size: 16px;
    line-height: 1.75;
    min-height: 100vh;
    position: relative;
  }
  body::after {
    content: '';
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: 35vh;
    background:
      linear-gradient(180deg, transparent 0%, rgba(255,100,200,0.05) 100%),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 79px,
        rgba(255,100,200,0.15) 79px,
        rgba(255,100,200,0.15) 80px
      ),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 79px,
        rgba(255,100,200,0.1) 79px,
        rgba(255,100,200,0.1) 80px
      );
    background-size: 100% 100%, 80px 80px, 80px 80px;
    transform: perspective(400px) rotateX(45deg);
    transform-origin: bottom;
    pointer-events: none;
    z-index: 0;
  }
  article {
    position: relative;
    z-index: 1;
    max-width: 740px;
    margin: 0 auto;
    padding: 50px 24px 80px;
  }
  h1 {
    font-family: 'Audiowide', sans-serif;
    font-size: 32px;
    background: linear-gradient(180deg, #fff 0%, #f472b6 50%, #c026d3 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
    margin-bottom: 12px;
    letter-spacing: 1px;
  }
  h2 {
    font-family: 'Audiowide', sans-serif;
    font-size: 20px;
    color: #f0abfc;
    margin: 38px 0 14px;
    text-shadow: 0 0 20px rgba(244,114,182,0.5);
  }
  h3 {
    font-size: 18px;
    color: #e879f9;
    margin: 28px 0 10px;
    font-weight: 600;
  }
  p { margin: 12px 0; }
  a { color: #f0abfc; text-decoration: none; border-bottom: 1px solid rgba(244,114,182,0.4); }
  a:hover { text-shadow: 0 0 8px rgba(244,114,182,0.6); }
  code {
    background: rgba(192,38,211,0.2);
    border: 1px solid rgba(192,38,211,0.3);
    padding: 2px 8px;
    border-radius: 4px;
    color: #f0abfc;
    font-size: 14px;
  }
  pre {
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(244,114,182,0.2);
    padding: 18px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 16px 0;
    box-shadow: 0 0 30px rgba(192,38,211,0.1);
  }
  pre code { background: none; border: none; color: #e8d5f5; padding: 0; }
  ul, ol { padding-left: 24px; margin: 12px 0; }
  li { margin: 6px 0; }
  li::marker { color: #f472b6; }
  strong { color: #fff; }
  hr { border: none; height: 2px; background: linear-gradient(90deg, transparent, #f472b6, #c026d3, transparent); margin: 30px 0; }
  blockquote {
    border-left: 3px solid #c026d3;
    padding: 10px 18px;
    margin: 16px 0;
    background: rgba(192,38,211,0.08);
  }
</style>`,

// ── 10: Notebook ─────────────────────────────────────────────────────────────
notebook: () => `
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Patrick+Hand&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #fafafa;
    background-image:
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 31px,
        #c8daf0 31px,
        #c8daf0 32px
      );
    background-size: 100% 32px;
    background-position: 0 60px;
    color: #333;
    font-family: 'Patrick Hand', cursive;
    font-size: 19px;
    line-height: 32px;
    min-height: 100vh;
    position: relative;
  }
  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 80px;
    width: 2px;
    height: 100%;
    background: #e74c3c;
    opacity: 0.4;
    z-index: 0;
  }
  article {
    position: relative;
    z-index: 1;
    max-width: 700px;
    margin: 0 auto;
    padding: 60px 24px 80px 100px;
  }
  h1 {
    font-family: 'Caveat', cursive;
    font-size: 42px;
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 16px;
    line-height: 1.2;
    border-bottom: 3px solid #2c3e50;
    padding-bottom: 8px;
  }
  h2 {
    font-family: 'Caveat', cursive;
    font-size: 30px;
    font-weight: 600;
    color: #e74c3c;
    margin: 32px 0 12px;
    text-decoration: underline;
    text-decoration-style: wavy;
    text-underline-offset: 4px;
  }
  h3 {
    font-family: 'Caveat', cursive;
    font-size: 24px;
    color: #2980b9;
    margin: 24px 0 8px;
  }
  p { margin: 8px 0; }
  a { color: #2980b9; text-decoration: underline; }
  a:hover { color: #e74c3c; }
  code {
    background: #fff8c5;
    border: 1px dashed #e6c200;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    color: #555;
  }
  pre {
    background: #fff;
    border: 2px dashed #aaa;
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 16px 0;
    font-family: 'Courier New', monospace;
    font-size: 15px;
    line-height: 24px;
    transform: rotate(-0.3deg);
  }
  pre code { background: none; border: none; padding: 0; color: #333; font-size: 15px; }
  ul, ol { padding-left: 24px; margin: 8px 0; }
  li { margin: 4px 0; }
  li::marker { color: #e74c3c; }
  strong { color: #000; text-decoration: underline; }
  em { color: #2980b9; }
  hr { border: none; border-top: 2px dashed #aaa; margin: 24px 0; }
  blockquote {
    background: #fffde7;
    border: 1px solid #e6c200;
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 4px;
    transform: rotate(0.5deg);
    box-shadow: 2px 2px 4px rgba(0,0,0,0.08);
  }
</style>`,

// ── 11: Swiss Design ─────────────────────────────────────────────────────────
swiss: () => `
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #fff;
    color: #1a1a1a;
    font-family: 'IBM Plex Sans', Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.65;
  }
  article {
    max-width: 900px;
    margin: 0 auto;
    padding: 60px 24px 80px;
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 0 40px;
  }
  article > * { grid-column: 2; }
  h1 {
    grid-column: 1 / -1;
    font-size: 48px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -1px;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 6px solid #ff0000;
  }
  h2 {
    grid-column: 1;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: #ff0000;
    margin: 36px 0 14px;
    position: sticky;
    top: 80px;
    align-self: start;
  }
  h2 + p, h2 + ul, h2 + ol, h2 + pre, h2 + blockquote {
    margin-top: 36px;
  }
  h3 {
    font-size: 20px;
    font-weight: 500;
    margin: 28px 0 10px;
    color: #333;
  }
  p { margin: 12px 0; color: #444; }
  a { color: #ff0000; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 2px;
    font-size: 14px;
    color: #333;
  }
  pre {
    background: #f5f5f5;
    border-left: 4px solid #ff0000;
    padding: 18px;
    overflow-x: auto;
    margin: 16px 0;
  }
  pre code { background: none; padding: 0; }
  ul, ol { padding-left: 20px; margin: 12px 0; color: #444; }
  li { margin: 6px 0; }
  li::marker { color: #ff0000; }
  strong { font-weight: 700; color: #1a1a1a; }
  hr { border: none; height: 1px; background: #ddd; margin: 32px 0; grid-column: 1 / -1; }
  blockquote {
    border-left: 4px solid #ff0000;
    padding: 10px 18px;
    margin: 16px 0;
    color: #555;
    font-weight: 300;
  }
  @media (max-width: 700px) {
    article { grid-template-columns: 1fr; gap: 0; }
    article > * { grid-column: 1; }
    h1 { grid-column: 1; font-size: 32px; }
    h2 { grid-column: 1; position: static; margin-top: 28px; }
    h2 + p, h2 + ul, h2 + ol, h2 + pre, h2 + blockquote { margin-top: 10px; }
  }
</style>`,

// ── 12: Material Design ──────────────────────────────────────────────────────
material: () => `
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #f5f5f5;
    color: #212121;
    font-family: 'Roboto', system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.7;
  }
  article {
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }
  .card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);
    padding: 32px;
    margin: 20px 0;
    transition: box-shadow 0.2s;
  }
  .card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06); }
  .hero-card {
    background: linear-gradient(135deg, #1976d2, #1565c0);
    color: #fff;
    border-radius: 16px;
    padding: 40px 32px;
    margin-bottom: 24px;
    box-shadow: 0 4px 16px rgba(25,118,210,0.3);
  }
  h1 {
    font-size: 32px;
    font-weight: 300;
    letter-spacing: -0.5px;
    color: #fff;
    margin-bottom: 8px;
  }
  h2 {
    font-size: 22px;
    font-weight: 500;
    color: #1976d2;
    margin: 32px 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h3 {
    font-size: 18px;
    font-weight: 500;
    color: #424242;
    margin: 24px 0 10px;
  }
  p { margin: 12px 0; color: #616161; }
  a { color: #1976d2; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code {
    background: #e3f2fd;
    padding: 3px 8px;
    border-radius: 4px;
    font-family: 'Roboto Mono', monospace;
    font-size: 14px;
    color: #1565c0;
  }
  pre {
    background: #263238;
    color: #eeffff;
    padding: 20px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 16px 0;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  }
  pre code { background: none; padding: 0; color: #eeffff; }
  ul, ol { padding-left: 24px; margin: 12px 0; color: #616161; }
  li { margin: 6px 0; }
  li::marker { color: #1976d2; }
  strong { color: #212121; font-weight: 500; }
  hr { border: none; height: 1px; background: #e0e0e0; margin: 28px 0; }
  blockquote {
    background: #e3f2fd;
    border-left: 4px solid #1976d2;
    padding: 12px 20px;
    border-radius: 0 8px 8px 0;
    margin: 16px 0;
    color: #424242;
  }
</style>`,

};

// ═══════════════════════════════════════════════════════════════════════════════
// HTML WRAPPERS PER THEME
// ═══════════════════════════════════════════════════════════════════════════════

function wrapContent(theme, htmlContent) {
  switch (theme) {
    case 'glass':
      return `<div class="blob blob-1"></div><div class="blob blob-2"></div><div class="blob blob-3"></div><article>${htmlContent}</article>`;
    case 'newspaper':
      return `<article><div class="masthead"><div class="paper-name">The Developer's Gazette</div></div>${htmlContent}</article>`;
    case 'material': {
      // Wrap first heading in hero card, sections in cards
      const parts = htmlContent.split(/<h2/);
      let result = '';
      if (parts[0]) {
        result += `<div class="hero-card">${parts[0]}</div>`;
      }
      for (let i = 1; i < parts.length; i++) {
        // Find the next h2 boundary to wrap in a card
        result += `<div class="card"><h2${parts[i]}</div>`;
      }
      return `<article>${result}</article>`;
    }
    default:
      return `<article>${htmlContent}</article>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD ARTICLES
// ═══════════════════════════════════════════════════════════════════════════════

for (const art of articles) {
  const md = readFileSync(join(blogDir, art.file), 'utf-8');
  const title = extractTitle(md);
  const htmlContent = marked.parse(md);
  const themeCSS = themes[art.theme]();

  const isAvailable = art.id === '01' || art.id === '02' || art.id === '03' || art.id === '04' || art.id === '05' || art.id === '06' || art.id === '07' || art.id === '08';
  const blurOverlay = isAvailable ? '' : `<style>
.are-blur-wrap{filter:blur(5px);pointer-events:none;user-select:none}
.are-coming-soon-banner{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:50;background:rgba(10,10,20,0.93);backdrop-filter:blur(12px);color:#fff;padding:28px 48px;border-radius:14px;font-family:system-ui,-apple-system,sans-serif;text-align:center;pointer-events:auto;border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 32px rgba(0,0,0,0.4)}
.are-coming-soon-banner h2{font-size:24px;font-weight:700;margin-bottom:8px;color:#fff}
.are-coming-soon-banner p{font-size:14px;color:rgba(255,255,255,0.75);margin:0}
</style>
<div class="are-coming-soon-banner"><h2>Coming Soon</h2><p>This article is not yet available</p></div>`;

  const contentOpen = isAvailable ? '' : '<div class="are-blur-wrap">';
  const contentClose = isAvailable ? '' : '</div>';

  const page = `${commonHead(title)}
${themeCSS}
</head>
<body>
${nav(art.id, art.theme)}
${blurOverlay}
${contentOpen}
${wrapContent(art.theme, htmlContent)}
${contentClose}
</body>
</html>`;

  writeFileSync(join(outDir, `${art.id}.html`), page);
  console.log(`  ✓ ${art.id}.html (${art.theme})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD INDEX
// ═══════════════════════════════════════════════════════════════════════════════

const themeLabels = {
  terminal: 'Terminal',
  minimal: 'Minimal',
  blueprint: 'Blueprint',
  cyberpunk: 'Cyberpunk',
  nature: 'Nature',
  glass: 'Glassmorphism',
  newspaper: 'Newspaper',
  brutalist: 'Brutalist',
  synthwave: 'Synthwave',
  notebook: 'Notebook',
  swiss: 'Swiss Design',
  material: 'Material',
};

const themeColors = {
  terminal: { bg: '#0a0a0a', fg: '#00ff41', accent: '#00ff41' },
  minimal: { bg: '#f8f9fb', fg: '#1a1a2e', accent: '#6366f1' },
  blueprint: { bg: '#0d2137', fg: '#c5e1f5', accent: '#2196f3' },
  cyberpunk: { bg: '#0d0221', fg: '#e0d6ff', accent: '#ff2d95' },
  nature: { bg: '#f5f0e8', fg: '#3d3229', accent: '#4a7c59' },
  glass: { bg: '#1a0533', fg: '#e2e8f0', accent: '#a78bfa' },
  newspaper: { bg: '#f4f1ea', fg: '#2c2c2c', accent: '#8b0000' },
  brutalist: { bg: '#ff0', fg: '#000', accent: '#ff0000' },
  synthwave: { bg: '#1a0533', fg: '#e8d5f5', accent: '#f472b6' },
  notebook: { bg: '#fafafa', fg: '#333', accent: '#e74c3c' },
  swiss: { bg: '#fff', fg: '#1a1a1a', accent: '#ff0000' },
  material: { bg: '#1976d2', fg: '#fff', accent: '#1976d2' },
};

const cardItems = articles.map(art => {
  const md = readFileSync(join(blogDir, art.file), 'utf-8');
  const title = extractTitle(md);
  const c = themeColors[art.theme];
  const isAvailable = art.id === '01' || art.id === '02' || art.id === '03' || art.id === '04' || art.id === '05' || art.id === '06' || art.id === '07' || art.id === '08';
  const cls = isAvailable ? 'card' : 'card coming-soon';
  const badge = isAvailable ? '' : '<div class="coming-soon-badge">Coming Soon</div>';
  return `
    <a href="${art.id}.html" class="${cls}" style="--card-bg:${c.bg};--card-fg:${c.fg};--card-accent:${c.accent};">
      ${badge}
      <div class="card-number">${art.id}</div>
      <div class="card-content">
        <div class="card-theme">${themeLabels[art.theme]}</div>
        <h2>${title}</h2>
        <p>${art.tagline}</p>
      </div>
    </a>`;
}).join('\n');

const indexPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ARE Blog — agents-reverse-engineer</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #09090b;
    color: #fafafa;
    font-family: 'Inter', system-ui, sans-serif;
    min-height: 100vh;
  }
  .hero {
    text-align: center;
    padding: 80px 24px 60px;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    top: 0; left: 50%; width: 800px; height: 600px;
    transform: translateX(-50%);
    background: radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero h1 {
    font-size: 52px;
    font-weight: 800;
    letter-spacing: -2px;
    line-height: 1.1;
    background: linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #818cf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 16px;
    position: relative;
  }
  .hero p {
    font-size: 18px;
    color: #71717a;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }
  .hero .subtitle {
    display: inline-block;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: #6366f1;
    margin-bottom: 16px;
    position: relative;
  }
  .grid {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 24px 80px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }
  .card {
    display: flex;
    align-items: stretch;
    text-decoration: none;
    border-radius: 16px;
    overflow: hidden;
    background: var(--card-bg);
    border: 1px solid rgba(255,255,255,0.06);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    position: relative;
  }
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
  }
  .card.coming-soon {
    filter: blur(4px) grayscale(0.5);
    opacity: 0.45;
  }
  .card.coming-soon:hover {
    transform: translateY(-4px);
    opacity: 0.55;
    filter: blur(4px) grayscale(0.5);
  }
  .coming-soon-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(255,255,255,0.12);
    color: #a1a1aa;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    padding: 3px 8px;
    border-radius: 4px;
    backdrop-filter: blur(4px);
    z-index: 1;
  }
  .card-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    min-height: 140px;
    font-size: 24px;
    font-weight: 800;
    color: var(--card-accent);
    opacity: 0.7;
    border-right: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }
  .card-content {
    padding: 20px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .card-theme {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--card-accent);
  }
  .card-content h2 {
    font-size: 17px;
    font-weight: 600;
    color: var(--card-fg);
    line-height: 1.3;
  }
  .card-content p {
    font-size: 13px;
    color: var(--card-fg);
    opacity: 0.75;
    margin-top: auto;
  }
  .footer {
    text-align: center;
    padding: 40px 24px;
    color: #52525b;
    font-size: 14px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .footer a { color: #6366f1; text-decoration: none; }
  .footer a:hover { text-decoration: underline; }
  @media (max-width: 640px) {
    .hero h1 { font-size: 36px; }
    .grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="hero">
  <div class="subtitle">Blog Series</div>
  <h1>agents-reverse-engineer</h1>
</div>
<div class="grid">
${cardItems}
</div>
<div class="footer">
  <p>Built with <a href="https://github.com/GeoloeG-IsT/agents-reverse-engineer">agents-reverse-engineer</a> — giving AI assistants persistent codebase memory.</p>
</div>
</body>
</html>`;

writeFileSync(join(outDir, 'index.html'), indexPage);
console.log('  ✓ index.html');
console.log(`\nDone! ${articles.length + 1} pages generated in site/`);
