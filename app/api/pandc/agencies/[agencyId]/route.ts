import { NextResponse } from 'next/server';
import { getAgencyById, initDB } from '@/lib/services/db';
import { z } from 'zod';

// Basic UUID validation for path parameter
const paramsSchema = z.object({
  agencyId: z.string().uuid({ message: "Invalid agency ID format." }),
});

export async function GET(request: Request, { params }: { params: { agencyId: string } }) {
  try {
    const paramsValidation = paramsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return NextResponse.json({ errors: paramsValidation.error.flatten().fieldErrors }, { status: 400 });
    }

    // Ensure DB is initialized
    if (process.env.NODE_ENV !== 'test') {
        await initDB();
    }

    const { agencyId } = paramsValidation.data;
    const agency = await getAgencyById(agencyId);

    if (!agency) {
      return NextResponse.json({ message: 'Agency not found.' }, { status: 404 });
    }

    return NextResponse.json(agency);
  } catch (error: any) {
    console.error(`Error fetching agency ${params.agencyId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch agency.', error: error.message }, { status: 500 });
  }
}
