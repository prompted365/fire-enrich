import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
    createOrUpdateAgencySettings,
    getAgencySettings,
    initDB,
    AgencySettingsData
} from '@/lib/services/db';

const paramsSchema = z.object({
  agencyId: z.string().uuid({ message: "Invalid agency ID format." }),
});

const agencySettingsSchema = z.object({
  new_business_comp_pct: z.number().min(0).max(100).optional(),
  first_renewal_comp_pct: z.number().min(0).max(100).optional(),
  renewal_comp_pct: z.number().min(0).max(100).optional(),
  retention_rate_pct: z.number().min(0).max(100).optional(),
});

export async function GET(request: Request, { params }: { params: { agencyId: string } }) {
  try {
    const paramsValidation = paramsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return NextResponse.json({ errors: paramsValidation.error.flatten().fieldErrors }, { status: 400 });
    }

    if (process.env.NODE_ENV !== 'test') {
        await initDB();
    }

    const { agencyId } = paramsValidation.data;
    const settings = await getAgencySettings(agencyId);

    if (!settings) {
      // Return default settings or an empty object if preferred, instead of 404
      // This allows frontend to display form for initial creation gracefully
      return NextResponse.json({
        agency_id: agencyId,
        new_business_comp_pct: 15.00, // Default values
        first_renewal_comp_pct: 10.00,
        renewal_comp_pct: 8.00,
        retention_rate_pct: 75.00,
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error(`Error fetching settings for agency ${params.agencyId}:`, error);
    return NextResponse.json({ message: 'Failed to fetch agency settings.', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { agencyId: string } }) {
  try {
    const paramsValidation = paramsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return NextResponse.json({ errors: paramsValidation.error.flatten().fieldErrors }, { status: 400 });
    }

    if (process.env.NODE_ENV !== 'test') {
        await initDB();
    }

    const { agencyId } = paramsValidation.data;
    const body = await request.json();
    const validation = agencySettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const settingsData: AgencySettingsData = {
        agency_id: agencyId,
        ...validation.data
    };

    const updatedSettings = await createOrUpdateAgencySettings(settingsData);
    return NextResponse.json(updatedSettings, { status: 200 }); // 200 OK for update/create via upsert

  } catch (error: any) {
    console.error(`Error updating settings for agency ${params.agencyId}:`, error);
    // Could check for foreign key violation if agencyId does not exist, though GET for agency should precede this.
    return NextResponse.json({ message: 'Failed to update agency settings.', error: error.message }, { status: 500 });
  }
}
