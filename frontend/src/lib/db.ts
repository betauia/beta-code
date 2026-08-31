const DATABASE_URL = import.meta.env.DATABASE_URL || process.env.DATABASE_URL;

type GlobalPool = typeof globalThis & { __betaCodePoolPromise?: Promise<unknown> };

const globalForPool = globalThis as GlobalPool;

export async function getPool() {
  if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL");
  }

  if (!globalForPool.__betaCodePoolPromise) {
    globalForPool.__betaCodePoolPromise = import("pg").then(({ Pool, types }) => {
      // Our TIMESTAMP (no time zone) columns always hold UTC wall-clock values
      // (the DB session is forced to UTC below). Without this, node-postgres
      // parses those naive digits using the server process's local OS timezone
      // instead of UTC, silently shifting every stored time by that offset.
      types.setTypeParser(1114, (value: string) => new Date(`${value}Z`));

      const isLocalhost = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");
      return new Pool({
        connectionString: DATABASE_URL,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        options: "-c timezone=UTC",
      });
    });
  }

  return globalForPool.__betaCodePoolPromise;
}