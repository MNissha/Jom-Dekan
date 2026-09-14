import { pool } from "../config/config/db";

export type ModerationDecision =
  | "CONTENT_REMOVAL"
  | "POLICY_WARNING"
  | "CONTENT_RESTRICTION"
  | "ACCOUNT_WARNING"
  | "LISTING_SUSPENSION"
  | "NO_VIOLATION_FOUND"
  | "INSUFFICIENT_EVIDENCE"
  | "CONTENT_WITHIN_GUIDELINES"
  | "REPORT_NOT_APPLICABLE"
  | "DUPLICATE_REPORT";

export class ModerationModel {
  static async getNotificationsForUser(userId: string) {
    const query = `
            SELECT * FROM notifications 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 50
        `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async markNotificationRead(id: string, userId: string) {
    const query = `
            UPDATE notifications 
            SET read_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND user_id = $2 
            RETURNING *
        `;
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  }

  static async sendAnnouncement(
    adminId: string,
    input: { title: string; message: string; sendToAll: boolean; userIds: string[] },
  ) {
    const recipientFilter = input.sendToAll
      ? "u.role = 'USER' AND u.deleted_at IS NULL"
      : "u.role = 'USER' AND u.deleted_at IS NULL AND u.id = ANY($2::uuid[])";
    const payload = JSON.stringify({
      title: input.title,
      message: input.message,
      senderId: adminId,
    });
    const values = input.sendToAll ? [payload] : [payload, input.userIds];
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, payload)
       SELECT u.id, 'ANNOUNCEMENT', $1::jsonb
       FROM users u
       WHERE ${recipientFilter}
       RETURNING id`,
      values,
    );
    return result.rowCount ?? 0;
  }

  static async getModerationQueue() {
    const query = `
            SELECT r.id, 'resource' as entity_type, r.id as entity_id,
                   r.title as details, r.moderation_status, r.created_at,
                   'resource' as target_type, NULL::text as category,
                   NULL::text as reporter_name, NULL::text as reporter_phone,
                   NULL::text as reporter_email, r.title as target_title,
                   r.description as target_description, NULL::text as listing_type,
                   false as has_evidence, NULL::uuid as parent_id, NULL::text as parent_title,
                   NULL::text as parent_description, r.owner_id as target_owner_id
            FROM resources r
            WHERE r.moderation_status = 'pending_moderation'
            UNION ALL
            SELECT rep.id, 'report' as entity_type, rep.entity_id,
                   rep.reason as details, rep.status as moderation_status,
                   rep.created_at, rep.entity_type as target_type,
                   rep.category, rep.reporter_name, rep.reporter_phone,
                   rep.reporter_email,
                   COALESCE(resource.title, opportunity.title, post.title, LEFT(comment.body, 160), reported_profile.display_name, reported_user.email) as target_title,
                   COALESCE(resource.description, opportunity.description, post.body, comment.body, reported_user.email) as target_description,
                   opportunity.listing_type,
                   (rep.evidence_data IS NOT NULL) as has_evidence,
                   rep.parent_id as parent_id, parent.title as parent_title, parent.body as parent_description,
                   COALESCE(resource.owner_id, opportunity.owner_id, post.author_id, comment.author_id, reported_user.id) as target_owner_id
            FROM reports rep
            LEFT JOIN resources resource
              ON rep.entity_type = 'resource' AND resource.id = rep.entity_id
            LEFT JOIN opportunities opportunity
              ON rep.entity_type = 'opportunity' AND opportunity.id = rep.entity_id
            LEFT JOIN forum_posts post
              ON rep.entity_type = 'forum_post' AND post.id = rep.entity_id
            LEFT JOIN forum_comments comment
              ON rep.entity_type = 'forum_comment' AND comment.id = rep.entity_id
            LEFT JOIN forum_posts parent
              ON parent.id = COALESCE(rep.parent_id, comment.post_id)
            LEFT JOIN users reported_user
              ON rep.entity_type = 'user' AND reported_user.id = rep.entity_id
            LEFT JOIN user_profiles reported_profile
              ON reported_profile.user_id = reported_user.id
            WHERE UPPER(rep.status) = 'PENDING'
            ORDER BY created_at DESC
        `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async resolveReport(
    reportId: string,
    status: "RESOLVED_APPROVED" | "RESOLVED_REJECTED",
    moderationDecision: ModerationDecision,
    adminId: string,
    responseTitle: string,
    responseMessage: string,
    notificationTitle: string,
    notificationMessage: string,
    moderationNotes: string | undefined,
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const updated = await client.query(
        `UPDATE reports
         SET status = $1, moderation_decision = $2,
             admin_response_title = $3, admin_response_message = $4,
             moderation_notes = $5, reviewed_by = $6, reviewed_at = CURRENT_TIMESTAMP,
             notification_delivery_status = 'SENT', email_delivery_status = 'PENDING'
         WHERE id = $7 AND UPPER(status) = 'PENDING'
         RETURNING *`,
        [status, moderationDecision, responseTitle, responseMessage, moderationNotes ?? null, adminId, reportId],
      );
      const report = updated.rows[0];
      if (!report) {
        await client.query("ROLLBACK");
        return null;
      }
      if (
        status === "RESOLVED_APPROVED" &&
        ["CONTENT_REMOVAL", "CONTENT_RESTRICTION", "LISTING_SUSPENSION"].includes(
          moderationDecision,
        )
      ) {
        if (report.entity_type === "resource") {
          await client.query(
            `UPDATE resources SET moderation_status = 'quarantined' WHERE id = $1`,
            [report.entity_id],
          );
        } else if (report.entity_type === "opportunity") {
          await client.query(
            `UPDATE opportunities SET status = 'closed' WHERE id = $1`,
            [report.entity_id],
          );
        } else if (report.entity_type === "forum_post") {
          await client.query(
            `UPDATE forum_posts SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP) WHERE id = $1`,
            [report.entity_id],
          );
        } else if (report.entity_type === "forum_comment") {
          if (moderationDecision === "CONTENT_REMOVAL") {
            await client.query(
              `UPDATE forum_comments
               SET moderation_status = 'removed', deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
               WHERE id = $1`,
              [report.entity_id],
            );
          } else if (moderationDecision === "CONTENT_RESTRICTION") {
            await client.query(
              `UPDATE forum_comments SET moderation_status = 'restricted' WHERE id = $1`,
              [report.entity_id],
            );
          }
        }
      }
      let commentOwner: { id: string; email: string; thread_title: string } | null = null;
      if (report.entity_type === "forum_comment") {
        const ownerResult = await client.query(
          `SELECT u.id, u.email, p.title AS thread_title
           FROM forum_comments c
           JOIN users u ON u.id = c.author_id
           JOIN forum_posts p ON p.id = c.post_id
           WHERE c.id = $1`,
          [report.entity_id],
        );
        commentOwner = ownerResult.rows[0] ?? null;
        if (commentOwner && status === "RESOLVED_APPROVED") {
          const ownerMessage =
            moderationDecision === "CONTENT_REMOVAL"
              ? `Your comment in "${commentOwner.thread_title}" was removed because it violated JomDekan's Community Guidelines.`
              : moderationDecision === "CONTENT_RESTRICTION"
                ? `Your comment in "${commentOwner.thread_title}" was restricted following a moderation review.`
                : `A policy warning was issued regarding your comment in "${commentOwner.thread_title}".`;
          await client.query(
            `INSERT INTO notifications (user_id, type, payload)
             VALUES ($1, 'COMMENT_MODERATED', $2::jsonb)`,
            [commentOwner.id, JSON.stringify({ title: "Action Taken on Your Comment", message: ownerMessage })],
          );
        }
      }
      if (report.reporter_id) {
        await client.query(
          `INSERT INTO notifications (user_id, type, payload)
           VALUES ($1, 'REPORT_REVIEWED', $2::jsonb)`,
          [
            report.reporter_id,
            JSON.stringify({
              title: notificationTitle,
              message: notificationMessage,
              response: responseMessage,
              reportId,
              status,
              moderationDecision,
            }),
          ],
        );
      }
      await client.query(
        `INSERT INTO audit_logs
           (actor_user_id, action, target_type, target_id, reason, metadata)
         VALUES ($1, $2, 'report', $3, $4, $5::jsonb)`,
        [
          adminId,
          status,
          reportId,
          responseMessage,
          JSON.stringify({
            status,
            moderationDecision,
            responseTitle,
            moderationNotes: moderationNotes ?? null,
            notificationDeliveryStatus: "SENT",
            emailDeliveryStatus: "PENDING",
          }),
        ],
      );
      await client.query("COMMIT");
      return commentOwner
        ? {
            ...report,
            comment_owner_email: commentOwner.email,
            discussion_title: commentOwner.thread_title,
          }
        : report;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateReportEmailStatus(reportId: string, status: "SENT" | "FAILED") {
    await pool.query(
      `UPDATE reports SET email_delivery_status = $1 WHERE id = $2`,
      [status, reportId],
    );
  }

  static async updateResourceModeration(
    resourceId: string,
    status: string,
    adminId: string,
    reason: string,
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Update resource status
      const updateQuery = `
                UPDATE resources 
                SET moderation_status = $1 
                WHERE id = $2 
                RETURNING *
            `;
      const updated = await client.query(updateQuery, [status, resourceId]);

      // Mandatory immutable audit log entry
      const auditQuery = `
                INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, reason, metadata)
                VALUES ($1, $2, 'resource', $3, $4, $5)
            `;

      await client.query(auditQuery, [
        adminId,
        `MODERATION_${status.toUpperCase()}`,
        resourceId,
        reason,
        JSON.stringify({ status }),
      ]);

      await client.query("COMMIT");
      return updated.rows[0];
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}
