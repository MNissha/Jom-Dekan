const query = jest.fn();

jest.mock("../src/config/config/db", () => ({
  pool: { query },
}));

import { ModerationModel } from "../src/models/moderationModel";

describe("ModerationModel notification ownership", () => {
  beforeEach(() => query.mockReset());

  it("marks only the authenticated user's unread notifications as read", async () => {
    query.mockResolvedValue({ rows: [{ id: "notification-1", read_at: new Date() }] });

    const result = await ModerationModel.markAllNotificationsRead("user-1");

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE user_id = $1 AND read_at IS NULL"),
      ["user-1"],
    );
    expect(result).toHaveLength(1);
  });

  it("enriches opportunity notifications while scoping the inbox to its owner", async () => {
    query.mockResolvedValue({ rows: [] });

    await ModerationModel.getNotificationsForUser("user-1");

    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/n\.type LIKE 'OPPORTUNITY_%'[\s\S]*WHERE n\.user_id = \$1/),
      ["user-1"],
    );
  });
});
