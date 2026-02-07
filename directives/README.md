# Directives

This directory contains SOPs (Standard Operating Procedures) written in Markdown.

Each directive should include:

- **Goal**: What this directive accomplishes
- **Inputs**: What data/parameters are needed
- **Tools**: Which execution scripts to use
- **Outputs**: What gets created (deliverables, intermediates)
- **Edge Cases**: Common errors, API limits, timing considerations
- **Example Usage**: How the orchestration layer should use this

## Template

```markdown
# [Directive Name]

## Goal
What this accomplishes

## Inputs
- Input 1: description
- Input 2: description

## Tools
- `execution/script_name.py`: what it does

## Process
1. Step 1
2. Step 2
3. Step 3

## Outputs
- Deliverable: where it lives (Google Sheets, etc.)
- Intermediate: `.tmp/filename.json`

## Edge Cases
- API rate limits: 100 requests/minute
- Missing data: handle gracefully
- Timing: takes ~30 seconds per item

## Example Usage
\`\`\`
python execution/script_name.py --input "value"
\`\`\`
```
