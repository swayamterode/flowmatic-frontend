import { NextResponse } from "next/server";

import { promptRefineService } from "@/features/prompt-refine/service";
import { MESSAGE_MAX_CHARS, type MetaPromptRequest } from "@/features/prompt-refine/types";
import { errorResponse } from "@/lib/api/responses";
import { withAccessToken } from "@/lib/auth/access-token";
import { sessionCookieWrites } from "@/lib/auth/cookies";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Partial<MetaPromptRequest> | null;
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ error: "Write something in the prompt first." }, { status: 400 });
    }

    if (message.length > MESSAGE_MAX_CHARS) {
      return NextResponse.json(
        { error: `That prompt is too long to refine — ${MESSAGE_MAX_CHARS} characters at most.` },
        { status: 400 },
      );
    }

    const { data, session } = await withAccessToken((token) =>
      promptRefineService.metaPrompt({ message }, token),
    );

    if (typeof data?.prompt !== "string" || !data.prompt.trim()) {
      console.error("[api] meta-prompt answered without a prompt", data);
      return NextResponse.json({ error: "Could not refine that prompt." }, { status: 502 });
    }

    const response = NextResponse.json({ prompt: data.prompt });
    if (session) {
      for (const { name, value, options } of sessionCookieWrites(session)) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (error) {
    return errorResponse(error, "Could not refine that prompt.");
  }
}
