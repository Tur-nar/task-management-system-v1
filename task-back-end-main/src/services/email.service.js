const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Path to the MSSpace logo for CID embedding in emails
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'msspace.png');
const LOGO_CID = 'msspace-logo';

// ──────────────────────────────────────────────
// Resend client (singleton)
// ──────────────────────────────────────────────
let resendClient = null;

function getResendClient() {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    logger.warn('Email service disabled — RESEND_API_KEY not set.');
    return null;
  }

  resendClient = new Resend(apiKey);
  logger.info('Resend email client initialized');
  return resendClient;
}

// ──────────────────────────────────────────────
// Low-level send function (fire-and-forget)
// ──────────────────────────────────────────────
async function sendEmail({ to, subject, html, attachments = [] }) {
  try {
    const client = getResendClient();
    if (!client) return; // Email disabled — silently skip

    const fromName = process.env.MAIL_FROM_NAME || 'MSSpace TaskManager';
    const fromAddr = process.env.MAIL_FROM_ADDRESS || 'noreply@msspaceglobal.com';

    // Convert nodemailer-style attachments to Resend format
    const resendAttachments = attachments
      .filter((a) => a.path && fs.existsSync(a.path))
      .map((a) => ({
        filename: a.filename,
        content: fs.readFileSync(a.path),
      }));

    // Replace CID references with inline base64 data URIs
    // since Resend doesn't support CID embedding the same way nodemailer does
    let processedHtml = html;
    if (fs.existsSync(LOGO_PATH)) {
      const logoBase64 = fs.readFileSync(LOGO_PATH).toString('base64');
      const logoDataUri = `data:image/png;base64,${logoBase64}`;
      processedHtml = html.replace(new RegExp(`cid:${LOGO_CID}`, 'g'), logoDataUri);
    }

    const { data, error } = await client.emails.send({
      from: `${fromName} <${fromAddr}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: processedHtml,
      attachments: resendAttachments.length > 0 ? resendAttachments : undefined,
    });

    if (error) {
      logger.error(`Email send failed (to: ${to}, subject: "${subject}"): ${error.message}`);
      return;
    }

    logger.info(`Email sent to ${to}: "${subject}" (id: ${data?.id})`);
  } catch (error) {
    // Never throw — email failures must not break the app
    logger.error(`Email send failed (to: ${to}, subject: "${subject}"): ${error.message}`);
  }
}

// ──────────────────────────────────────────────
// Severity → visual styling
// ──────────────────────────────────────────────
const SEVERITY_CONFIG = {
  info:     { color: '#1C2458', icon: '📋', label: 'Information' },
  warning:  { color: '#D97706', icon: '⚠️', label: 'Warning' },
  critical: { color: '#DC2626', icon: '🚨', label: 'Critical' },
  success:  { color: '#16A34A', icon: '✅', label: 'Success' },
};

const TYPE_SUBJECTS = {
  task_assigned:      (title) => `📋 New Task Assigned: "${title}"`,
  task_completed:     (title) => `✅ Task Completed: "${title}"`,
  deadline_warning:   (title) => `⚠️ Deadline Approaching: "${title}"`,
  overdue_alert:      (title) => `🚨 Task Overdue: "${title}"`,
  performance_update: ()      => `📊 Performance Update`,
  general:            (title) => `📢 ${title}`,
};

// ──────────────────────────────────────────────
// Branded HTML email builder
// ──────────────────────────────────────────────
function buildNotificationHtml({ recipientName, title, message, severity, type, taskTitle, taskDeadline }) {
  const sev = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const dashboardLink = `${frontendUrl}/dashboard/notifications`;
  const year = new Date().getFullYear(); 

  const taskDetailsBlock = taskTitle
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0;">
        <tr>
          <td style="padding: 16px;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Task Details</p>
            <p style="margin: 0 0 8px; font-size: 15px; font-weight: 600; color: #1C2458;">${taskTitle}</p>
            ${taskDeadline ? `<p style="margin: 0; font-size: 13px; color: #64748B;">📅 Deadline: <strong style="color: #334155;">${taskDeadline}</strong></p>` : ''}
          </td>
        </tr>
      </table>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F1F5F9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header with logo -->
          <tr>
            <td align="center" style="padding: 24px 0 20px;">
              <img src="cid:${LOGO_CID}" alt="MSSpace Global" width="220" style="display: block; max-width: 220px; height: auto;" />
            </td>
          </tr>

          <!-- Severity accent bar -->
          <tr>
            <td>
              <div style="height: 4px; background: linear-gradient(90deg, ${sev.color}, ${sev.color}80); border-radius: 4px 4px 0 0;"></div>
            </td>
          </tr>

          <!-- Main content card -->
          <tr>
            <td style="background: #FFFFFF; padding: 32px 32px 24px; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

              <!-- Severity badge -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background: ${sev.color}15; border: 1px solid ${sev.color}30; border-radius: 20px; padding: 4px 14px;">
                    <span style="font-size: 13px; color: ${sev.color}; font-weight: 600;">${sev.icon} ${sev.label}</span>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <p style="margin: 0 0 8px; font-size: 15px; color: #64748B;">Hello${recipientName ? ` ${recipientName}` : ''},</p>

              <!-- Title -->
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #1C2458; line-height: 1.3;">${title}</h1>

              <!-- Message -->
              <p style="margin: 0 0 20px; font-size: 15px; color: #334155; line-height: 1.6;">${message}</p>

              <!-- Task details (conditional) -->
              ${taskDetailsBlock}

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin: 24px 0 8px;">
                <tr>
                  <td style="background: #1C2458; border-radius: 8px;">
                    <a href="${dashboardLink}" style="display: inline-block; padding: 12px 28px; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.3px;">
                      View in Dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 16px 8px;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #94A3B8; font-weight: 600; display: flex; align-items: center; gap: 8px; justify-content: center; text-align: center; width: 100%;">
                <img src="cid:${LOGO_CID}" alt="MSSpace Global" width="120" style="display: block; max-width: 120px; height: auto;" />
                <span style="color: #94A3B8; font-weight: 400;">Global</span>
              </p>
              <p style="margin: 0 0 12px; font-size: 11px; color: #94A3B8;">Management System Space</p>
              <p style="margin: 0; font-size: 11px; color: #CBD5E1;">
                © ${year} MSSpace Global. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #CBD5E1;">
                This is an automated notification from MSSpace TaskManager.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ──────────────────────────────────────────────
// High-level notification email sender
// ──────────────────────────────────────────────

/**
 * Send a branded notification email.
 * @param {Object} opts
 * @param {string} opts.recipientEmail
 * @param {string} [opts.recipientName]
 * @param {string} opts.title           - Notification title
 * @param {string} opts.message         - Notification body
 * @param {string} [opts.severity]      - info | warning | critical | success
 * @param {string} [opts.type]          - Notification type (for subject line)
 * @param {string} [opts.taskTitle]     - Optional task title for details block
 * @param {string} [opts.taskDeadline]  - Optional deadline string
 */
async function sendNotificationEmail({
  recipientEmail,
  recipientName,
  title,
  message,
  severity = 'info',
  type = 'general',
  taskTitle,
  taskDeadline,
}) {
  const subjectFn = TYPE_SUBJECTS[type] || TYPE_SUBJECTS.general;
  const subject = subjectFn(taskTitle || title);

  const html = buildNotificationHtml({
    recipientName,
    title,
    message,
    severity,
    type,
    taskTitle,
    taskDeadline,
  });

  await sendEmail({
    to: recipientEmail,
    subject,
    html,
    attachments: [
      {
        filename: 'msspace.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
      },
    ],
  });
}

/**
 * Resolve a user ID to { email, firstName } and send a notification email.
 * Used for direct Notification.create() calls where we have the userId.
 * @param {string} userId
 * @param {Object} payload - { title, message, type, severity, taskTitle?, taskDeadline? }
 */
async function sendEmailForNotification(userId, payload) {
  try {
    // Lazy-require to avoid circular deps
    const { User } = require('../models');
    const user = await User.findByPk(userId, { attributes: ['email', 'firstName'] });
    if (!user) return;

    await sendNotificationEmail({
      recipientEmail: user.email,
      recipientName: user.firstName,
      ...payload,
    });
  } catch (error) {
    logger.error(`sendEmailForNotification error (userId: ${userId}): ${error.message}`);
  }
}

module.exports = {
  sendEmail,
  sendNotificationEmail,
  sendEmailForNotification,
  getTransporter: getResendClient, // backward-compatible alias
};
