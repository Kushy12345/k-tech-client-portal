import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { submissionId } = await request.json();

    if (typeof submissionId !== 'string' || !submissionId) {
      return NextResponse.json({ error: 'Submission ID is required.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .select('id, business_name, contact_name, contact_email, status, is_draft, submitted_at, template_id')
      .eq('id', submissionId)
      .eq('user_id', userData.user.id)
      .eq('is_draft', false)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const notificationEmail = process.env.KTECH_NOTIFICATION_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!resendApiKey || !notificationEmail || !fromEmail) {
      console.error('New request email is not configured.');
      return NextResponse.json({ sent: false, configured: false }, { status: 503 });
    }

    const origin = new URL(request.url).origin;
    const requestUrl = `${origin}/admin/submissions/${submission.id}`;
    const clientName = submission.contact_name || 'A new client';
    const businessName = submission.business_name || 'Website & Digital Solution Discovery';
    const submittedAt = submission.submitted_at
      ? new Date(submission.submitted_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Just now';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [notificationEmail],
        subject: `New project request from ${clientName}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:640px">
            <h2 style="margin-bottom:8px">New K-Tech project request</h2>
            <p>A client has submitted a new project request through the K-Tech Technologies portal.</p>
            <table style="border-collapse:collapse;width:100%;margin:20px 0">
              <tr><td style="padding:8px 0;font-weight:bold">Client</td><td style="padding:8px 0">${clientName}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold">Business</td><td style="padding:8px 0">${businessName}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold">Email</td><td style="padding:8px 0">${submission.contact_email || 'Not provided'}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold">Status</td><td style="padding:8px 0">${submission.status}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold">Submitted</td><td style="padding:8px 0">${submittedAt}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold">Reference</td><td style="padding:8px 0">${submission.id}</td></tr>
            </table>
            <p><a href="${requestUrl}" style="display:inline-block;padding:12px 18px;background:#172033;color:#fff;text-decoration:none;border-radius:8px">View Request</a></p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error('Resend email failed:', response.status, details);
      return NextResponse.json({ sent: false }, { status: 502 });
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('New request notification failed:', error);
    return NextResponse.json({ sent: false }, { status: 500 });
  }
}
