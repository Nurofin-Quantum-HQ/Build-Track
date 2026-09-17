const express = require("express");
const router  = express.Router();
const { updateProfile, getSubscription, getProfile, updateProfilePhoto, assignOversightRoles, skipOnboarding, visitModule } = require("../controllers/userController");
const { protect, authorize } = require("../middleware/auth");
router.get("/profile",       protect, getProfile);
router.put("/profile/photo", protect, updateProfilePhoto);
router.put("/profile",       protect, updateProfile);
router.put("/onboarding/skip", protect, skipOnboarding);
router.post("/onboarding/visit-module", protect, visitModule);
router.get("/subscription", protect, getSubscription);
// [BT-SEC-01] Removed: PUT /subscription (updateSubscription) — self-grant of an
// unverified subscription. Orphaned Google Play IAP scaffolding; entitlement now
// comes only from the AirPay-backed /api/subscriptions/* flow. Re-add with real
// Google Play purchase-token verification if/when native IAP is built.
router.put("/:id/oversight", protect, authorize("Admin"), assignOversightRoles);
module.exports = router;
