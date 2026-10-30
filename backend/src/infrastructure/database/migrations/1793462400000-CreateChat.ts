import { MigrationInterface, QueryRunner } from "typeorm";

// Bảng của module chat: conversation theo workspace/space/DM, tin nhắn, đính kèm, mention, reaction.

export class CreateChat1793462400000 implements MigrationInterface {
    name = 'CreateChat1793462400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "message_attachments" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "created_by" integer, "updated_by" integer, "conversation_id" integer NOT NULL, "message_id" integer, "original_name" character varying(255) NOT NULL, "file_path" character varying(500) NOT NULL, "mime_type" character varying(255) NOT NULL, "size" integer NOT NULL, CONSTRAINT "PK_e5085d973567c61e9306f10f95b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_message_attachments_pending" ON "message_attachments"  ("created_at") WHERE "message_id" IS NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_message_attachments_message" ON "message_attachments"  ("message_id") `);
        await queryRunner.query(`CREATE TABLE "message_mentions" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "created_by" integer, "updated_by" integer, "message_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "UQ_message_mentions_message_user" UNIQUE ("message_id", "user_id"), CONSTRAINT "PK_6d3047d9fb0dd841366be90fb87" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_message_mentions_user" ON "message_mentions"  ("user_id", "message_id") `);
        await queryRunner.query(`CREATE TABLE "message_reactions" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "created_by" integer, "updated_by" integer, "message_id" integer NOT NULL, "user_id" integer NOT NULL, "emoji" character varying(32) NOT NULL, CONSTRAINT "UQ_message_reactions_message_user_emoji" UNIQUE ("message_id", "user_id", "emoji"), CONSTRAINT "PK_654a9f0059ff93a8f156be66a5b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "created_by" integer, "updated_by" integer, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" integer, "conversation_id" integer NOT NULL, "author_id" integer, "parent_id" integer, "type" character varying(20) NOT NULL DEFAULT 'TEXT', "content_type" character varying(255) NOT NULL DEFAULT 'markdown', "content" text NOT NULL DEFAULT '', "data" jsonb, "client_message_id" uuid, "edited_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_messages_type" CHECK ("type" IN ('TEXT', 'SYSTEM')), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_messages_client_message" ON "messages"  ("conversation_id", "author_id", "client_message_id") WHERE "client_message_id" IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_messages_parent" ON "messages"  ("parent_id") WHERE "parent_id" IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_messages_conversation" ON "messages"  ("conversation_id", "id") `);
        await queryRunner.query(`CREATE TABLE "conversations" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "created_by" integer, "updated_by" integer, "deleted_at" TIMESTAMP WITH TIME ZONE, "deleted_by" integer, "workspace_id" integer NOT NULL, "space_id" integer, "type" character varying(20) NOT NULL, "name" character varying(255), "direct_key" character varying(255), "last_message_id" integer, "last_message_at" TIMESTAMP WITH TIME ZONE, "archived_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_conversations_scope" CHECK (("type" = 'SPACE') = ("space_id" IS NOT NULL) AND ("type" = 'DIRECT') = ("direct_key" IS NOT NULL)), CONSTRAINT "CHK_conversations_type" CHECK ("type" IN ('WORKSPACE', 'SPACE', 'DIRECT')), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_conversations_workspace_activity" ON "conversations"  ("workspace_id", "last_message_at") WHERE "deleted_at" IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_conversations_direct_key" ON "conversations"  ("workspace_id", "direct_key") WHERE "direct_key" IS NOT NULL AND "deleted_at" IS NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_conversations_space" ON "conversations"  ("space_id") WHERE "type" = 'SPACE' AND "deleted_at" IS NULL`);
        await queryRunner.query(`CREATE TABLE "conversation_participants" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), "created_by" integer, "updated_by" integer, "conversation_id" integer NOT NULL, "user_id" integer NOT NULL, "last_read_message_id" integer, "last_read_at" TIMESTAMP WITH TIME ZONE, "muted" boolean NOT NULL DEFAULT false, "pinned" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_conversation_participants_conversation_user" UNIQUE ("conversation_id", "user_id"), CONSTRAINT "PK_61b51428ad9453f5921369fbe94" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_conversation_participants_user" ON "conversation_participants"  ("user_id") `);
        await queryRunner.query(`ALTER TABLE "message_attachments" ADD CONSTRAINT "FK_message_attachments_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message_attachments" ADD CONSTRAINT "FK_message_attachments_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message_mentions" ADD CONSTRAINT "FK_message_mentions_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message_mentions" ADD CONSTRAINT "FK_message_mentions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message_reactions" ADD CONSTRAINT "FK_message_reactions_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message_reactions" ADD CONSTRAINT "FK_message_reactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_parent" FOREIGN KEY ("parent_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_space" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_last_message" FOREIGN KEY ("last_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversation_participants" ADD CONSTRAINT "FK_conversation_participants_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversation_participants" ADD CONSTRAINT "FK_conversation_participants_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversation_participants" ADD CONSTRAINT "FK_conversation_participants_last_read" FOREIGN KEY ("last_read_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_conversation_participants_last_read"`);
        await queryRunner.query(`ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_conversation_participants_user"`);
        await queryRunner.query(`ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_conversation_participants_conversation"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_conversations_last_message"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_conversations_space"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_conversations_workspace"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_parent"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_author"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_conversation"`);
        await queryRunner.query(`ALTER TABLE "message_reactions" DROP CONSTRAINT "FK_message_reactions_user"`);
        await queryRunner.query(`ALTER TABLE "message_reactions" DROP CONSTRAINT "FK_message_reactions_message"`);
        await queryRunner.query(`ALTER TABLE "message_mentions" DROP CONSTRAINT "FK_message_mentions_user"`);
        await queryRunner.query(`ALTER TABLE "message_mentions" DROP CONSTRAINT "FK_message_mentions_message"`);
        await queryRunner.query(`ALTER TABLE "message_attachments" DROP CONSTRAINT "FK_message_attachments_message"`);
        await queryRunner.query(`ALTER TABLE "message_attachments" DROP CONSTRAINT "FK_message_attachments_conversation"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_conversation_participants_user"`);
        await queryRunner.query(`DROP TABLE "conversation_participants"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_conversations_space"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_conversations_direct_key"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_conversations_workspace_activity"`);
        await queryRunner.query(`DROP TABLE "conversations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_messages_conversation"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_messages_parent"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_messages_client_message"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TABLE "message_reactions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_message_mentions_user"`);
        await queryRunner.query(`DROP TABLE "message_mentions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_message_attachments_message"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_message_attachments_pending"`);
        await queryRunner.query(`DROP TABLE "message_attachments"`);
    }

}
