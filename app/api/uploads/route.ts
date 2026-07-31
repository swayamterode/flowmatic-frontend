import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api/responses";
import { withAccessToken } from "@/lib/auth/access-token";
import { sessionCookieWrites } from "@/lib/auth/cookies";
import { CSV_MAX_BYTES, CSV_MAX_LABEL } from "@/components/workflow/csv-preview";
import { uploadService } from "@/services/upload.service";

/**
 * CSV upload. The browser posts multipart here; Spring never hears from it
 * directly, and the bearer token never leaves the server.
 *
 * The same size and extension rules the Datasource node applies are re-checked
 * here, because the client-side check is only a courtesy — anyone can post
 * straight at this route. Spring's own multipart cap is the backstop.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Attach a CSV file under the field name 'file'." },
        { status: 400 },
      );
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "Only .csv files are accepted." }, { status: 400 });
    }
    if (file.size > CSV_MAX_BYTES) {
      return NextResponse.json(
        { error: `That file is larger than ${CSV_MAX_LABEL}.` },
        { status: 413 },
      );
    }

    const { data, session } = await withAccessToken((token) => uploadService.create(file, token));

    const response = NextResponse.json(data, { status: 201 });
    if (session) {
      for (const { name, value, options } of sessionCookieWrites(session)) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  } catch (error) {
    return errorResponse(error, "Could not upload that file.");
  }
}
