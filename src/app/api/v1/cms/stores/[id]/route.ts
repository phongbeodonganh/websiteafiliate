import { handleStores } from "@/lib/stores/cms";

type Context = { params: Promise<{ id: string }> };
export async function PUT(req: Request, context: Context) { return handleStores(req, (await context.params).id); }
export async function DELETE(req: Request, context: Context) { return handleStores(req, (await context.params).id); }
