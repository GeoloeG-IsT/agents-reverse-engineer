# Agents Reverse:

A light-weight and powerful tool to reverse engineer a brownfield project and generate adequate AGENTS.md and CLAUDE.md among others... Compatible with Claude Code, OpenCode and many other agent tools.

## Inception

Agents Reverse was born out of the need to streamline the process of documenting and understanding existing projects. It aims to provide agents with a clear and concise overview of their codebase, making it easier to maintain the project over time.
It can be used in conjunction with other tools to enhance the overall development workflow like:
- SpecKit: https://github.com/github/spec-kit
- BMAD: https://github.com/bmad-code-org/BMAD-METHOD
- Get Shit Done (GSD): https://github.com/glittercowboy/get-shit-done

## Features

- It should provide a command that will execute script usin Recursive Language Model with Claude Calude or and other LLM Agents tool. For Claude, it will be a command, ffor other, the available alternative.
- It should be possible to add a hook on the end of a session to update the impacted files
- It should generate AGENTS.md file in every directory of the structure
- Each AGENTS.md file will be describing the content of the current directory and sub-structure. They can reference other files like ARCHITECTURE.md, STRUCTURE.md, STACK.md, INTEGRATIONS.md, INFRASTRUCTURE.md, CONVENTIONS.md, TESTING.md, PATTERNS.md, CONCERNS.md, etc...
- The RLM will work as follow:
    * build the project structure tree
    * with start by executing the call at the first leaf and build recursively backward
    * since the leaf is a file, analyse the file and generate a summary {filename}.sum
    * when all leaf of a directory are summarized, analyse the directory and generate AGENTS.md file and other files if needed
    * continue recursively until the root of the project is reached

## Reaserch

Analyse in details GSD and BMAD.

We'll use a similar repository structure mainly to GSD and a bit of BMAD.

Look at how they are approaching a brownfiled project, speical command and details about how they are doing. Check their codebase in details if needed.

## Usage

To use Agents Reverse, simply run the following command in your terminal:

```bash
/ar:generate
/ar:update
```
