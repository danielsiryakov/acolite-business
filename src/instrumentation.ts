export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initTaskQueue } = await import("./lib/task-queue");
    await initTaskQueue();
    const { startScheduler } = await import("./lib/task-scheduler");
    startScheduler();
  }
}
