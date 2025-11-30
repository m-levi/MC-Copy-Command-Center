import { Resend } from 'resend';

// Lazy-initialize Resend client to avoid build errors when API key is not set
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Shared email styles
const emailStyles = `
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
    line-height: 1.6; 
    color: #1a1a2e; 
    background-color: #f5f5f7;
    margin: 0;
    padding: 0;
  }
  .wrapper {
    background-color: #f5f5f7;
    padding: 40px 20px;
  }
  .container { 
    max-width: 560px; 
    margin: 0 auto; 
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }
  .header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    padding: 24px 32px;
    text-align: center;
  }
  .header h1 {
    margin: 0;
    color: white;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.3px;
  }
  .content {
    padding: 32px;
  }
  .button { 
    display: inline-block; 
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white !important; 
    padding: 14px 28px; 
    text-decoration: none; 
    border-radius: 8px; 
    font-weight: 600; 
    margin: 20px 0;
    font-size: 14px;
    letter-spacing: 0.3px;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }
  .button:hover {
    background: linear-gradient(135deg, #5558e3 0%, #7c4deb 100%);
  }
  .button-secondary {
    background: #f1f5f9;
    color: #475569 !important;
    box-shadow: none;
    border: 1px solid #e2e8f0;
  }
  .context-box {
    background: #f8fafc;
    border-left: 4px solid #6366f1;
    padding: 16px;
    margin: 20px 0;
    border-radius: 0 8px 8px 0;
  }
  .context-box p {
    margin: 0;
    color: #64748b;
    font-size: 14px;
  }
  .context-box strong {
    color: #1e293b;
  }
  .quoted-text {
    background: #fef9c3;
    border-left: 4px solid #eab308;
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: #713f12;
  }
  .footer { 
    padding: 24px 32px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    font-size: 12px; 
    color: #64748b;
    text-align: center;
  }
  .footer a {
    color: #6366f1;
    text-decoration: none;
  }
  .meta {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 16px;
  }
  .badge {
    display: inline-block;
    background: #e0e7ff;
    color: #4338ca;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }
  .badge-yellow {
    background: #fef3c7;
    color: #92400e;
  }
  .badge-green {
    background: #d1fae5;
    color: #065f46;
  }
`;

// Check if email service is configured
function isEmailConfigured(): boolean {
  const hasKey = !!process.env.RESEND_API_KEY;
  if (!hasKey) {
    console.warn('[Email Service] RESEND_API_KEY is not set');
  }
  return hasKey;
}

// Send email helper
async function sendEmail(to: string, subject: string, html: string) {
  console.log(`[Email Service] Attempting to send email to: ${to}, subject: ${subject}`);
  
  if (!isEmailConfigured()) {
    console.warn('[Email Service] Skipping - API key not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const client = getResendClient();
  if (!client) {
    console.warn('[Email Service] Skipping - Resend client not initialized');
    return { success: false, error: 'Email service not configured' };
  }

  console.log(`[Email Service] Sending from: ${EMAIL_FROM}`);

  try {
    const data = await client.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log('[Email Service] Email sent successfully:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('[Email Service] Failed to send email:', error?.message || error);
    console.error('[Email Service] Full error:', JSON.stringify(error, null, 2));
    return { success: false, error };
  }
}

// ============================================================================
// Team Invite Email
// ============================================================================

export interface SendInviteEmailParams {
  to: string;
  inviteLink: string;
  inviterName?: string;
  organizationName?: string;
  role: string;
}

export async function sendInviteEmail({
  to,
  inviteLink,
  inviterName,
  organizationName = 'Scribe',
  role,
}: SendInviteEmailParams) {
  const subject = `You've been invited to join ${organizationName}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${emailStyles}</style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>✨ Team Invitation</h1>
            </div>
            <div class="content">
              <h2 style="margin-top: 0; color: #1a1a2e;">Hello!</h2>
              <p>
                ${inviterName ? `<strong>${inviterName}</strong>` : 'Someone'} has invited you to join 
                <strong>${organizationName}</strong> as a <span class="badge">${role.replace('_', ' ')}</span>.
              </p>
              <p>Click below to accept and set up your account:</p>
              <div style="text-align: center;">
                <a href="${inviteLink}" class="button">Accept Invitation</a>
              </div>
              <p style="margin-top: 30px; font-size: 13px; color: #64748b;">
                Or copy this link:<br>
                <a href="${inviteLink}" style="color: #6366f1; word-break: break-all;">${inviteLink}</a>
              </p>
            </div>
            <div class="footer">
              <p>This invitation expires in 7 days.</p>
              <p>If you didn't expect this, you can safely ignore it.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, subject, html);
}

// ============================================================================
// Comment Notification Emails
// ============================================================================

export interface CommentNotificationParams {
  to: string;
  commenterName: string;
  commentContent: string;
  conversationTitle?: string;
  brandName?: string;
  conversationLink: string;
  quotedText?: string;
}

export async function sendCommentAddedEmail({
  to,
  commenterName,
  commentContent,
  conversationTitle,
  brandName,
  conversationLink,
  quotedText,
}: CommentNotificationParams) {
  const subject = `💬 New comment from ${commenterName}${brandName ? ` on ${brandName}` : ''}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${emailStyles}</style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>💬 New Comment</h1>
            </div>
            <div class="content">
              <p class="meta">
                <strong>${commenterName}</strong> left a comment
                ${conversationTitle ? `on <strong>${conversationTitle}</strong>` : ''}
              </p>
              
              ${quotedText ? `
                <div class="quoted-text">
                  "${quotedText}"
                </div>
              ` : ''}
              
              <div class="context-box">
                <p>${commentContent}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${conversationLink}" class="button">View Comment</a>
              </div>
            </div>
            <div class="footer">
              <p>You received this because you're the conversation owner.</p>
              <p><a href="${APP_URL}/settings/notifications">Manage notification settings</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, subject, html);
}

export interface CommentAssignedParams {
  to: string;
  assignerName: string;
  commentContent: string;
  conversationTitle?: string;
  brandName?: string;
  conversationLink: string;
  quotedText?: string;
}

export async function sendCommentAssignedEmail({
  to,
  assignerName,
  commentContent,
  conversationTitle,
  brandName,
  conversationLink,
  quotedText,
}: CommentAssignedParams) {
  const subject = `📌 ${assignerName} assigned you a task${brandName ? ` on ${brandName}` : ''}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${emailStyles}</style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>📌 Task Assigned</h1>
            </div>
            <div class="content">
              <p class="meta">
                <strong>${assignerName}</strong> assigned you to a comment
                ${conversationTitle ? `on <strong>${conversationTitle}</strong>` : ''}
              </p>
              
              ${quotedText ? `
                <div class="quoted-text">
                  "${quotedText}"
                </div>
              ` : ''}
              
              <div class="context-box">
                <p>${commentContent}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${conversationLink}" class="button">View Assignment</a>
              </div>
            </div>
            <div class="footer">
              <p>You were assigned this task by ${assignerName}.</p>
              <p><a href="${APP_URL}/settings/notifications">Manage notification settings</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, subject, html);
}

export interface CommentMentionParams {
  to: string;
  mentionerName: string;
  commentContent: string;
  conversationTitle?: string;
  brandName?: string;
  conversationLink: string;
}

export async function sendCommentMentionEmail({
  to,
  mentionerName,
  commentContent,
  conversationTitle,
  brandName,
  conversationLink,
}: CommentMentionParams) {
  const subject = `👋 ${mentionerName} mentioned you${brandName ? ` on ${brandName}` : ''}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${emailStyles}</style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>👋 You Were Mentioned</h1>
            </div>
            <div class="content">
              <p class="meta">
                <strong>${mentionerName}</strong> mentioned you in a comment
                ${conversationTitle ? `on <strong>${conversationTitle}</strong>` : ''}
              </p>
              
              <div class="context-box">
                <p>${commentContent}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${conversationLink}" class="button">View Discussion</a>
              </div>
            </div>
            <div class="footer">
              <p>You were @mentioned in this comment.</p>
              <p><a href="${APP_URL}/settings/notifications">Manage notification settings</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, subject, html);
}

// ============================================================================
// Review Status Emails
// ============================================================================

export interface ReviewRequestParams {
  to: string;
  requesterName: string;
  conversationTitle: string;
  brandName?: string;
  conversationLink: string;
  message?: string;
}

export async function sendReviewRequestEmail({
  to,
  requesterName,
  conversationTitle,
  brandName,
  conversationLink,
  message,
}: ReviewRequestParams) {
  const subject = `🔍 Review requested: ${conversationTitle}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${emailStyles}</style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>🔍 Review Requested</h1>
            </div>
            <div class="content">
              <p class="meta">
                <strong>${requesterName}</strong> is requesting your review
                ${brandName ? `for <span class="badge">${brandName}</span>` : ''}
              </p>
              
              <h3 style="margin-bottom: 8px; color: #1a1a2e;">${conversationTitle}</h3>
              
              ${message ? `
                <div class="context-box">
                  <p><strong>Message:</strong> ${message}</p>
                </div>
              ` : ''}
              
              <div style="text-align: center;">
                <a href="${conversationLink}" class="button">Start Review</a>
              </div>
            </div>
            <div class="footer">
              <p>This email is awaiting your feedback.</p>
              <p><a href="${APP_URL}/settings/notifications">Manage notification settings</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, subject, html);
}

export interface ReviewCompletedParams {
  to: string;
  reviewerName: string;
  conversationTitle: string;
  brandName?: string;
  conversationLink: string;
  status: 'approved' | 'changes_requested';
  feedback?: string;
}

export async function sendReviewCompletedEmail({
  to,
  reviewerName,
  conversationTitle,
  brandName,
  conversationLink,
  status,
  feedback,
}: ReviewCompletedParams) {
  const isApproved = status === 'approved';
  const emoji = isApproved ? '✅' : '📝';
  const statusText = isApproved ? 'Approved' : 'Changes Requested';
  const badgeClass = isApproved ? 'badge-green' : 'badge-yellow';
  
  const subject = `${emoji} ${conversationTitle} - ${statusText}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>${emailStyles}</style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>${emoji} Review Complete</h1>
            </div>
            <div class="content">
              <p class="meta">
                <strong>${reviewerName}</strong> has completed their review
                ${brandName ? `for <span class="badge">${brandName}</span>` : ''}
              </p>
              
              <h3 style="margin-bottom: 8px; color: #1a1a2e;">
                ${conversationTitle}
                <span class="badge ${badgeClass}" style="margin-left: 8px;">${statusText}</span>
              </h3>
              
              ${feedback ? `
                <div class="context-box">
                  <p><strong>Feedback:</strong> ${feedback}</p>
                </div>
              ` : ''}
              
              <div style="text-align: center;">
                <a href="${conversationLink}" class="button">View Details</a>
              </div>
            </div>
            <div class="footer">
              <p>Your email has been reviewed by ${reviewerName}.</p>
              <p><a href="${APP_URL}/settings/notifications">Manage notification settings</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(to, subject, html);
}

// ============================================================================
// Email Notification Preferences Check
// ============================================================================

export type NotificationType = 
  | 'comment_added' 
  | 'comment_assigned' 
  | 'comment_mention'
  | 'review_requested'
  | 'review_completed'
  | 'team_invite';

export async function shouldSendEmail(
  supabase: any,
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  console.log(`[Email Service] Checking if should send ${notificationType} email to user ${userId}`);
  
  try {
    const { data: prefs, error } = await supabase
      .from('user_preferences')
      .select('email_notifications')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.log(`[Email Service] No preferences found for user, defaulting to send: ${error.message}`);
      return true; // Default to sending if no preferences
    }

    // Default to true if no preferences set
    if (!prefs?.email_notifications) {
      console.log('[Email Service] No email_notifications preferences, defaulting to send');
      return true;
    }

    const emailPrefs = prefs.email_notifications;
    console.log('[Email Service] User email preferences:', JSON.stringify(emailPrefs));
    
    // Check the master toggle
    if (emailPrefs.enabled === false) {
      console.log('[Email Service] Master toggle is OFF, not sending');
      return false;
    }
    
    // Check the specific notification type
    if (emailPrefs[notificationType] === false) {
      console.log(`[Email Service] ${notificationType} is disabled, not sending`);
      return false;
    }

    console.log('[Email Service] All checks passed, will send email');
    return true;
  } catch (err) {
    console.log('[Email Service] Error checking preferences, defaulting to send:', err);
    // Default to sending if we can't check preferences
    return true;
  }
}

// Export for testing
export { isEmailConfigured, sendEmail }



