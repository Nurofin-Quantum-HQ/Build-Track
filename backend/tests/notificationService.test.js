/**
 * notificationService.test.js
 *
 * Unit tests for NotificationService: preference-aware fan-out,
 * in-app persistence fields, unread counting, admin/supervisor routing
 * and account-wide broadcasts.
 *
 * Run with: npm test tests/notificationService.test.js
 */

'use strict';

jest.mock("../models/Notification");
jest.mock("../models/User");

const NotificationService = require("../services/NotificationService");
const Notification = require("../models/Notification");
const User = require("../models/User");

describe("NotificationService.prefers", () => {
  it("allows when channel and type are enabled (defaults)", () => {
    expect(NotificationService.prefers({ notificationPreferences: {} }, "payment", "email")).toBe(true);
  });

  it("blocks when the channel is disabled", () => {
    const user = { notificationPreferences: { email: false, types: { payment: true } } };
    expect(NotificationService.prefers(user, "payment", "email")).toBe(false);
  });

  it("blocks when the type is disabled but the channel is on", () => {
    const user = { notificationPreferences: { email: true, types: { task: false } } };
    expect(NotificationService.prefers(user, "task", "email")).toBe(false);
  });

  it("allows types without an explicit preference", () => {
    const user = { notificationPreferences: { email: true, types: { approval: false } } };
    expect(NotificationService.prefers(user, "system", "email")).toBe(true);
  });

  it("applies the push channel preference", () => {
    const user = { notificationPreferences: { push: false } };
    expect(NotificationService.prefers(user, "payment", "push")).toBe(false);
  });
});

describe("NotificationService.send", () => {
  beforeEach(() => jest.clearAllMocks());

  it("persists an in-app notification with priority/data/related fields", async () => {
    Notification.create.mockResolvedValue({ _id: "N1", channel: "in_app" });
    User.findById.mockResolvedValue({ email: "a@b.com", notificationPreferences: {} });

    await NotificationService.send("U1", {
      title: "Task Assigned",
      message: "Task #1 assigned",
      type: "task",
      priority: "high",
      data: { project: "P1", status: "Not Started" },
      relatedId: "P1",
      relatedModel: "Project",
    });

    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
      user: "U1",
      title: "Task Assigned",
      message: "Task #1 assigned",
      type: "task",
      priority: "high",
      data: { project: "P1", status: "Not Started" },
      relatedId: "P1",
      relatedModel: "Project",
      channel: "in_app",
    }));
  });

  it("defaults priority to low and type to system", async () => {
    Notification.create.mockResolvedValue({});
    User.findById.mockResolvedValue({ email: "a@b.com", notificationPreferences: {} });

    await NotificationService.send("U1", { title: "T", message: "M" });

    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
      type: "system",
      priority: "low",
    }));
  });

  it("skips out-of-app fan-out when the type is muted", async () => {
    Notification.create.mockResolvedValue({});
    User.findById.mockResolvedValue({ email: "a@b.com", notificationPreferences: { email: true, types: { payment: false } } });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    await NotificationService.send("U1", { title: "T", message: "M", type: "payment" });

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("logs out-of-app delivery when prefs allow", async () => {
    Notification.create.mockResolvedValue({});
    User.findById.mockResolvedValue({ email: "a@b.com", notificationPreferences: {} });
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    await NotificationService.send("U1", { title: "T", message: "M", type: "approval" });

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

describe("NotificationService.getUnreadCount", () => {
  it("counts unread notifications for the user", async () => {
    Notification.countDocuments.mockResolvedValue(3);
    const count = await NotificationService.getUnreadCount("U1");
    expect(count).toBe(3);
    expect(Notification.countDocuments).toHaveBeenCalledWith({ user: "U1", read: false });
  });
});

describe("NotificationService.notifyAdminsAndSupervisors", () => {
  beforeEach(() => jest.clearAllMocks());

  it("notifies the admin and only supervisors overseeing the worker role", async () => {
    User.findById.mockResolvedValue({ createdBy: "A", role: "Mason" });
    User.find.mockResolvedValue([
      { _id: "S1", role: "Supervisor", overseesRoles: ["Mason"] },
      { _id: "S2", role: "Supervisor", overseesRoles: ["Carpenter"] },
    ]);
    const sendSpy = jest.spyOn(NotificationService, "send").mockResolvedValue({});

    await NotificationService.notifyAdminsAndSupervisors("W1", {
      title: "New Entry Pending Approval",
      message: "Approval needed",
      type: "approval",
    });

    expect(User.find).toHaveBeenCalledWith({ createdBy: "A", role: "Supervisor" });
    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenCalledWith("A", expect.objectContaining({ type: "approval" }));
    expect(sendSpy).toHaveBeenCalledWith("S1", expect.anything());
    expect(sendSpy).not.toHaveBeenCalledWith("S2", expect.anything());
    sendSpy.mockRestore();
  });

  it("returns early when the worker has no admin", async () => {
    User.findById.mockResolvedValue({ createdBy: null, role: "Mason" });
    const sendSpy = jest.spyOn(NotificationService, "send").mockResolvedValue({});

    await NotificationService.notifyAdminsAndSupervisors("W1", { title: "T", message: "M", type: "approval" });

    expect(sendSpy).not.toHaveBeenCalled();
    sendSpy.mockRestore();
  });
});

describe("NotificationService.broadcastToAccount", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends a system notification to the admin and its sub-users", async () => {
    User.find.mockResolvedValue([{ _id: "A" }, { _id: "S1" }]);
    const sendSpy = jest.spyOn(NotificationService, "send").mockResolvedValue({});

    await NotificationService.broadcastToAccount("A", { title: "System Update", message: "Maintenance" });

    expect(User.find).toHaveBeenCalledWith({ $or: [{ _id: "A" }, { createdBy: "A" }] });
    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenCalledWith("S1", expect.objectContaining({ type: "system", priority: "medium" }));
    sendSpy.mockRestore();
  });
});

describe("NotificationService.ALL_TYPES", () => {
  it("exposes the full set of notification types", () => {
    expect(NotificationService.ALL_TYPES).toEqual(
      expect.arrayContaining(["approval", "payment", "inventory", "project", "worker", "task", "system"])
    );
  });
});