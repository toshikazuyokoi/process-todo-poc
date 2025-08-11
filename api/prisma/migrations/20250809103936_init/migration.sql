-- CreateTable
CREATE TABLE "public"."process_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."step_templates" (
    "id" SERIAL NOT NULL,
    "process_id" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "offset_days" INTEGER NOT NULL DEFAULT 0,
    "required_artifacts_json" JSONB NOT NULL DEFAULT '[]',
    "depends_on_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "step_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cases" (
    "id" SERIAL NOT NULL,
    "process_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "goal_date_utc" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."step_instances" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "template_id" INTEGER,
    "name" TEXT NOT NULL,
    "due_date_utc" TIMESTAMP(3),
    "assignee_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "step_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."artifacts" (
    "id" SERIAL NOT NULL,
    "step_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."holidays" (
    "country_code" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("country_code","date")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_id" INTEGER,
    "resource_type" TEXT NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "diff_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_step_templates_process_seq" ON "public"."step_templates"("process_id", "seq");

-- CreateIndex
CREATE INDEX "idx_cases_process_status" ON "public"."cases"("process_id", "status");

-- CreateIndex
CREATE INDEX "idx_step_instances_case_due" ON "public"."step_instances"("case_id", "due_date_utc");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- AddForeignKey
ALTER TABLE "public"."step_templates" ADD CONSTRAINT "step_templates_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."process_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cases" ADD CONSTRAINT "cases_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "public"."process_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cases" ADD CONSTRAINT "cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."step_instances" ADD CONSTRAINT "step_instances_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."step_instances" ADD CONSTRAINT "step_instances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."step_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."step_instances" ADD CONSTRAINT "step_instances_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."artifacts" ADD CONSTRAINT "artifacts_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."step_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
