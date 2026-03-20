ALTER TABLE "issues" ADD COLUMN "is_milestone" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "reviewer_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "reviewer_user_id" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "review_approval_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "completion_report" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "review_summary" text;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reviewer_agent_id_agents_id_fk" FOREIGN KEY ("reviewer_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_review_approval_id_approvals_id_fk" FOREIGN KEY ("review_approval_id") REFERENCES "public"."approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_company_goal_milestone_idx" ON "issues" USING btree ("company_id","goal_id","is_milestone");