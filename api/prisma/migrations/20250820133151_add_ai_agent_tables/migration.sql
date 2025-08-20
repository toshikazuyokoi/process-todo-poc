-- CreateTable
CREATE TABLE "public"."ai_interview_sessions" (
    "id" SERIAL NOT NULL,
    "session_id" VARCHAR(36) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "context" JSONB,
    "conversation" JSONB NOT NULL DEFAULT '[]',
    "extracted_requirements" JSONB NOT NULL DEFAULT '[]',
    "generated_template" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_interview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_background_jobs" (
    "id" SERIAL NOT NULL,
    "job_id" VARCHAR(36) NOT NULL,
    "job_type" VARCHAR(50) NOT NULL,
    "job_data" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "session_id" VARCHAR(36),
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "result" JSONB,

    CONSTRAINT "ai_background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_process_knowledge" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "industry" VARCHAR(100),
    "process_type" VARCHAR(100),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "best_practices" JSONB NOT NULL DEFAULT '[]',
    "compliance_requirements" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "confidence_score" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    "source" VARCHAR(255),
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_process_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_web_research_cache" (
    "id" SERIAL NOT NULL,
    "query_hash" VARCHAR(64) NOT NULL,
    "query_text" TEXT NOT NULL,
    "search_parameters" JSONB,
    "results" JSONB NOT NULL,
    "source_reliability" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 1,
    "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_web_research_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_template_generation_history" (
    "id" SERIAL NOT NULL,
    "session_id" VARCHAR(36) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "process_template_id" INTEGER,
    "generated_template" JSONB NOT NULL,
    "requirements_used" JSONB NOT NULL,
    "knowledge_sources" JSONB NOT NULL DEFAULT '[]',
    "research_sources" JSONB NOT NULL DEFAULT '[]',
    "confidence_score" DECIMAL(3,2),
    "user_feedback" JSONB,
    "feedback_rating" INTEGER,
    "was_used" BOOLEAN NOT NULL DEFAULT false,
    "modifications" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMP(3),

    CONSTRAINT "ai_template_generation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_usage_statistics" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action_type" VARCHAR(50) NOT NULL,
    "session_id" VARCHAR(36),
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    "processing_time_ms" INTEGER,
    "model_used" VARCHAR(50),
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_code" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_interview_sessions_session_id_key" ON "public"."ai_interview_sessions"("session_id");

-- CreateIndex
CREATE INDEX "ai_interview_sessions_session_id_idx" ON "public"."ai_interview_sessions"("session_id");

-- CreateIndex
CREATE INDEX "ai_interview_sessions_user_id_idx" ON "public"."ai_interview_sessions"("user_id");

-- CreateIndex
CREATE INDEX "ai_interview_sessions_status_idx" ON "public"."ai_interview_sessions"("status");

-- CreateIndex
CREATE INDEX "ai_interview_sessions_expires_at_idx" ON "public"."ai_interview_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "ai_interview_sessions_created_at_idx" ON "public"."ai_interview_sessions"("created_at");

-- CreateIndex
CREATE INDEX "idx_ai_interview_sessions_active" ON "public"."ai_interview_sessions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_background_jobs_job_id_key" ON "public"."ai_background_jobs"("job_id");

-- CreateIndex
CREATE INDEX "ai_background_jobs_job_id_idx" ON "public"."ai_background_jobs"("job_id");

-- CreateIndex
CREATE INDEX "ai_background_jobs_status_idx" ON "public"."ai_background_jobs"("status");

-- CreateIndex
CREATE INDEX "ai_background_jobs_session_id_idx" ON "public"."ai_background_jobs"("session_id");

-- CreateIndex
CREATE INDEX "ai_background_jobs_user_id_idx" ON "public"."ai_background_jobs"("user_id");

-- CreateIndex
CREATE INDEX "ai_background_jobs_job_type_idx" ON "public"."ai_background_jobs"("job_type");

-- CreateIndex
CREATE INDEX "ai_background_jobs_created_at_idx" ON "public"."ai_background_jobs"("created_at");

-- CreateIndex
CREATE INDEX "idx_ai_background_jobs_pending" ON "public"."ai_background_jobs"("created_at");

-- CreateIndex
CREATE INDEX "ai_process_knowledge_category_idx" ON "public"."ai_process_knowledge"("category");

-- CreateIndex
CREATE INDEX "ai_process_knowledge_industry_idx" ON "public"."ai_process_knowledge"("industry");

-- CreateIndex
CREATE INDEX "ai_process_knowledge_process_type_idx" ON "public"."ai_process_knowledge"("process_type");

-- CreateIndex
CREATE INDEX "ai_process_knowledge_is_active_idx" ON "public"."ai_process_knowledge"("is_active");

-- CreateIndex
CREATE INDEX "ai_process_knowledge_confidence_score_idx" ON "public"."ai_process_knowledge"("confidence_score");

-- CreateIndex
CREATE INDEX "idx_ai_process_knowledge_lookup" ON "public"."ai_process_knowledge"("industry", "process_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ai_web_research_cache_query_hash_key" ON "public"."ai_web_research_cache"("query_hash");

-- CreateIndex
CREATE INDEX "ai_web_research_cache_query_hash_idx" ON "public"."ai_web_research_cache"("query_hash");

-- CreateIndex
CREATE INDEX "ai_web_research_cache_expires_at_idx" ON "public"."ai_web_research_cache"("expires_at");

-- CreateIndex
CREATE INDEX "ai_web_research_cache_created_at_idx" ON "public"."ai_web_research_cache"("created_at");

-- CreateIndex
CREATE INDEX "idx_ai_web_research_cache_valid" ON "public"."ai_web_research_cache"("last_accessed_at");

-- CreateIndex
CREATE INDEX "ai_template_generation_history_session_id_idx" ON "public"."ai_template_generation_history"("session_id");

-- CreateIndex
CREATE INDEX "ai_template_generation_history_user_id_idx" ON "public"."ai_template_generation_history"("user_id");

-- CreateIndex
CREATE INDEX "ai_template_generation_history_process_template_id_idx" ON "public"."ai_template_generation_history"("process_template_id");

-- CreateIndex
CREATE INDEX "ai_template_generation_history_created_at_idx" ON "public"."ai_template_generation_history"("created_at");

-- CreateIndex
CREATE INDEX "ai_template_generation_history_was_used_idx" ON "public"."ai_template_generation_history"("was_used");

-- CreateIndex
CREATE INDEX "ai_template_generation_history_feedback_rating_idx" ON "public"."ai_template_generation_history"("feedback_rating");

-- CreateIndex
CREATE INDEX "ai_usage_statistics_user_id_idx" ON "public"."ai_usage_statistics"("user_id");

-- CreateIndex
CREATE INDEX "ai_usage_statistics_action_type_idx" ON "public"."ai_usage_statistics"("action_type");

-- CreateIndex
CREATE INDEX "ai_usage_statistics_created_at_idx" ON "public"."ai_usage_statistics"("created_at");

-- CreateIndex
CREATE INDEX "ai_usage_statistics_success_idx" ON "public"."ai_usage_statistics"("success");

-- CreateIndex
CREATE INDEX "idx_ai_usage_statistics_report" ON "public"."ai_usage_statistics"("user_id", "action_type", "created_at");

-- AddForeignKey
ALTER TABLE "public"."ai_interview_sessions" ADD CONSTRAINT "ai_interview_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_background_jobs" ADD CONSTRAINT "ai_background_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_background_jobs" ADD CONSTRAINT "ai_background_jobs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."ai_interview_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_process_knowledge" ADD CONSTRAINT "ai_process_knowledge_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_template_generation_history" ADD CONSTRAINT "ai_template_generation_history_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."ai_interview_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_template_generation_history" ADD CONSTRAINT "ai_template_generation_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_template_generation_history" ADD CONSTRAINT "ai_template_generation_history_process_template_id_fkey" FOREIGN KEY ("process_template_id") REFERENCES "public"."process_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_usage_statistics" ADD CONSTRAINT "ai_usage_statistics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
