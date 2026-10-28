-- CreateTable
CREATE TABLE "collection_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,

    CONSTRAINT "collection_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_collection_groups" (
    "file_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,

    CONSTRAINT "file_collection_groups_pkey" PRIMARY KEY ("file_id","group_id")
);

-- AddForeignKey
ALTER TABLE "collection_groups" ADD CONSTRAINT "collection_groups_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_collection_groups" ADD CONSTRAINT "file_collection_groups_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_collection_groups" ADD CONSTRAINT "file_collection_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "collection_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
