import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1770931614275 implements MigrationInterface {
  name = 'Migrations1770931614275';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('inactive', 'active', 'deleted', 'incomplete_profile', 'suspended', 'pending', 'locked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("user_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "email" character varying NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "password" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_96aac72f1574b88752e9fb00089" PRIMARY KEY ("user_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "organizations" ("org_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_963693341bd612aa01ddf3a4b68" UNIQUE ("slug"), CONSTRAINT "PK_bd5a04b9be15ee3895707072d4f" PRIMARY KEY ("org_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_members" ("membership_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, "org_id" uuid, "role_id" uuid, CONSTRAINT "UQ_4e244cb934b550f51edb0f2a5f7" UNIQUE ("user_id", "org_id"), CONSTRAINT "PK_69e0f179bf79218be32a62e489a" PRIMARY KEY ("membership_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "role" ("role_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "is_default" boolean NOT NULL DEFAULT false, "description" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_35c9b140caaf6da09cfabb0d675" UNIQUE ("slug"), CONSTRAINT "PK_df46160e6aa79943b83c81e496e" PRIMARY KEY ("role_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "permission" ("permission_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "entity" character varying NOT NULL, "action" character varying NOT NULL, "description" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3379e3b123dac5ec10734b8cc86" UNIQUE ("slug"), CONSTRAINT "PK_aaa6d61e22fb453965ae6157ce5" PRIMARY KEY ("permission_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "activities" ("activity_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entity_id" character varying NOT NULL, "org_id" uuid, "entity" character varying NOT NULL, "resource" character varying NOT NULL, "event" character varying NOT NULL, "activity" character varying NOT NULL, "ip_address" character varying NOT NULL, "event_date" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deviceInfoBrowser" character varying, "deviceInfoOs" character varying, "deviceInfoVersion" character varying, CONSTRAINT "PK_1ca2c10152039da7b4c08744ab9" PRIMARY KEY ("activity_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("roleRoleId" uuid NOT NULL, "permissionPermissionId" uuid NOT NULL, CONSTRAINT "PK_241347843350aff69b30b6fbb98" PRIMARY KEY ("roleRoleId", "permissionPermissionId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_399ef1c33bd9e8208fd7978034" ON "role_permissions" ("roleRoleId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_79ae6a0037dbb464a101178a00" ON "role_permissions" ("permissionPermissionId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" ADD CONSTRAINT "FK_89bde91f78d36ca41e9515d91c6" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" ADD CONSTRAINT "FK_fd8ec3efd79b2ee163cf98edd8c" FOREIGN KEY ("org_id") REFERENCES "organizations"("org_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" ADD CONSTRAINT "FK_5af5b0cc7f3012e9eb45d3df350" FOREIGN KEY ("role_id") REFERENCES "role"("role_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_399ef1c33bd9e8208fd79780344" FOREIGN KEY ("roleRoleId") REFERENCES "role"("role_id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_79ae6a0037dbb464a101178a00b" FOREIGN KEY ("permissionPermissionId") REFERENCES "permission"("permission_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_79ae6a0037dbb464a101178a00b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_399ef1c33bd9e8208fd79780344"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" DROP CONSTRAINT "FK_5af5b0cc7f3012e9eb45d3df350"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" DROP CONSTRAINT "FK_fd8ec3efd79b2ee163cf98edd8c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" DROP CONSTRAINT "FK_89bde91f78d36ca41e9515d91c6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_79ae6a0037dbb464a101178a00"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_399ef1c33bd9e8208fd7978034"`,
    );
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "activities"`);
    await queryRunner.query(`DROP TABLE "permission"`);
    await queryRunner.query(`DROP TABLE "role"`);
    await queryRunner.query(`DROP TABLE "organization_members"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
  }
}
