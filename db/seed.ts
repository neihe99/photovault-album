import { getDb } from "../server/queries/connection.js";
// TODO: import tables from "./schema.js"

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // TODO: insert seed data, e.g.
  // await db.insert(schema.posts).values([
  //   { title: "First post", content: "Hello world" },
  // ]);

  console.log("Done.");
  process.exit(0); // close MySQL connection pool
}

seed();
