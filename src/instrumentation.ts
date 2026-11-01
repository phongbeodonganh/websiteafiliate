export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { warmPublicRamCache } = await import("@/lib/warm-public-cache");
  await warmPublicRamCache();
}
