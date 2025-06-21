import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAgency, getAllAgencies, initDB } from '@/lib/services/db'; // Assuming initDB is called centrally

// Ensure DB is initialized - in a real app, this would be part of startup
// For now, call it here, but it should ideally be idempotent or handled globally.
// initDB().catch(console.error);

const agencyCreateSchema = z.object({
  name: z.string().min(1, { message: "Agency name cannot be empty." }),
});

export async function POST(request: Request) {
  try {
    // Ensure DB is initialized. In a real app, this is typically done once at startup.
    // Calling it per request like this is not ideal for production but ensures it runs for this context.
    // A better approach would be a middleware or a global setup.
    if (process.env.NODE_ENV !== 'test') { // Avoid re-initializing in some test environments if not needed
        await initDB();
    }

    const body = await request.json();
    const validation = agencyCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name } = validation.data;
    const newAgency = await createAgency(name);
    return NextResponse.json(newAgency, { status: 201 });
  } catch (error: any) {
    console.error('Error creating agency:', error);
    // Check for unique constraint violation (example for PostgreSQL)
    if (error.code === '23505' && error.constraint === 'agencies_name_key') {
        return NextResponse.json({ message: 'Agency name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Failed to create agency.', error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (process.env.NODE_ENV !== 'test') {
        await initDB();
    }
    const agencies = await getAllAgencies();
    return NextResponse.json(agencies);
  } catch (error: any) {
    console.error('Error fetching agencies:', error);
    return NextResponse.json({ message: 'Failed to fetch agencies.', error: error.message }, { status: 500 });
  }
}
