import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logDailyActivity, getDailyActivitiesForAgency, initDB, DailyActivityData } from '@/lib/services/db';

// Ensure DB is initialized - see notes in agencies/route.ts
// initDB().catch(console.error);

const dailyActivitySchema = z.object({
  agency_id: z.string().uuid({ message: "Invalid Agency ID." }),
  activity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Activity date must be in YYYY-MM-DD format." }),
  dials: z.number().int().min(0).optional(),
  contacts: z.number().int().min(0).optional(),
  transfers: z.number().int().min(0).optional(),
  quoted_transfers: z.number().int().min(0).optional(),
  failed_transfers: z.number().int().min(0).optional(),
  sales_qty: z.number().int().min(0).optional(),
  premium_sold: z.number().min(0).optional(),
  marketing_spend: z.number().min(0).optional(),
  lead_cost: z.number().min(0).optional(),
});

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV !== 'test') {
        await initDB();
    }
    const body = await request.json();
    const validation = dailyActivitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const activityData = validation.data as DailyActivityData; // Cast after validation
    const newActivity = await logDailyActivity(activityData);
    return NextResponse.json(newActivity, { status: 201 });
  } catch (error: any) {
    console.error('Error logging daily activity:', error);
    // More specific error handling can be added, e.g., foreign key violation if agency_id doesn't exist
    return NextResponse.json({ message: 'Failed to log daily activity.', error: error.message }, { status: 500 });
  }
}

const getActivitiesQuerySchema = z.object({
    agencyId: z.string().uuid({ message: "Invalid Agency ID." }),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Start date must be in YYYY-MM-DD format." }).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "End date must be in YYYY-MM-DD format." }).optional(),
});

export async function GET(request: Request) {
  try {
    if (process.env.NODE_ENV !== 'test') {
        await initDB();
    }
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = getActivitiesQuerySchema.safeParse(queryParams);
    if(!validation.success) {
        return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { agencyId, startDate, endDate } = validation.data;

    const activities = await getDailyActivitiesForAgency(agencyId, startDate, endDate);
    return NextResponse.json(activities);
  } catch (error: any) {
    console.error('Error fetching daily activities:', error);
    return NextResponse.json({ message: 'Failed to fetch daily activities.', error: error.message }, { status: 500 });
  }
}
