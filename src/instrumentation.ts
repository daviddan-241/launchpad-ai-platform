export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapAllWorkers } = await import("./lib/workers");
    bootstrapAllWorkers();
  }
}
