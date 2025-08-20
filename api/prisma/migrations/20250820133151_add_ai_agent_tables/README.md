# AI Agent Tables Migration

## Overview
This migration adds 6 new tables for the AI Agent Template Creation feature (v1.2).

## Tables Added

### 1. `ai_interview_sessions`
- Manages AI agent interview sessions with users
- Stores conversation history, extracted requirements, and generated templates
- Includes session expiration and status tracking

### 2. `ai_background_jobs`
- Manages background processing jobs for AI operations
- Supports job types: web_research, template_generation, requirement_analysis, knowledge_base_update
- Includes retry mechanism and job status tracking

### 3. `ai_process_knowledge`
- Knowledge base for process templates and best practices
- Stores industry-specific templates and compliance requirements
- Includes versioning and confidence scoring

### 4. `ai_web_research_cache`
- Caches web search results to reduce API calls
- Implements TTL-based expiration
- Tracks cache hit statistics

### 5. `ai_template_generation_history`
- Records all template generation attempts
- Stores user feedback and modifications
- Links generated templates to actual process templates when used

### 6. `ai_usage_statistics`
- Tracks AI feature usage for monitoring and billing
- Records token usage, costs, and processing times
- Supports usage analytics and reporting

## Indexes
- Optimized indexes for query performance
- Partial indexes for active sessions and pending jobs
- Composite indexes for reporting queries

## Constraints
- Check constraints for valid enum values
- Foreign key constraints with appropriate cascade rules
- Data validation constraints (e.g., confidence scores between 0 and 1)

## Data Retention
- Sessions expire after configurable timeout (default: 60 minutes)
- Web cache expires after 24 hours
- Background jobs cleaned up after 30 days

## Related Issues
- Epic: #24 - AI Agent Template Creation Feature v1.2
- Task: #25 - Week 1: Database & Configuration Foundation