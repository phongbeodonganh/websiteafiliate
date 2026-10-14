import { handleStores } from "@/lib/stores/cms";

export async function GET(req: Request) { return handleStores(req); }
export async function POST(req: Request) { return handleStores(req); }
