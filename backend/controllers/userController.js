const User = require("../models/User");
const safeUser = (user) => ({
  id:               user._id || user.id,
  _id:              user._id || user.id,
  name:             user.name,
  email:            user.email,
  phone:            user.phone || null,
  role:             user.role   || "Mason",
  permissions:      Array.isArray(user.permissions) ? user.permissions : [],
  projectIds:       Array.isArray(user.projectIds)  ? user.projectIds.map(String) : [],
  projectId:        user.projectId?.toString()       || null,
  profilePhoto:     user.profilePhoto               || null,
  provider:         user.provider                   || "local",
  isActive:         user.isActive !== undefined ? user.isActive : true,
  overseesRoles:    Array.isArray(user.overseesRoles) ? user.overseesRoles : [],
  twoFactorEnabled: !!user.twoFactorEnabled,
  onboarding:       user.onboarding || { hasSkippedTour: false, hasCreatedProject: false, hasAddedEntry: false },
  createdAt:        user.createdAt,
  updatedAt:        user.updatedAt,
});
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const { name, email, profilePhoto, role, phone } = req.body;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      user.name = trimmedName;
    }

    if (email !== undefined) {
      const trimmedEmail = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }
      if (trimmedEmail !== user.email) {
        const existing = await User.findOne({ email: trimmedEmail, _id: { $ne: user._id } });
        if (existing) {
          return res.status(409).json({ message: "Email already in use by another account" });
        }
        user.email = trimmedEmail;
      }
    }

    if (profilePhoto !== undefined) {
      user.profilePhoto = (profilePhoto === "" || profilePhoto === null) ? null : String(profilePhoto);
    }

    if (phone !== undefined) {
      if (phone === null || phone === "") {
        user.phone = null;
      } else {
        const digitsOnly = String(phone).replace(/\D/g, '');
        if (digitsOnly.length < 8 || digitsOnly.length > 15) {
          return res.status(400).json({ message: "Phone number must be 8–15 digits" });
        }
        user.phone = digitsOnly;
      }
    }

    if (role !== undefined) {
      const cleanRole = String(role).trim();
      if (!cleanRole) {
        return res.status(400).json({ message: "Role cannot be empty" });
      }
      
      const currentRole = (user.role || "").trim();
      const isRoleChanging = cleanRole.toLowerCase() !== currentRole.toLowerCase();

      if (isRoleChanging) {
        const isAuthorized =
          req.user.role === "Admin" ||
          req.user.role === "admin" ||
          (Array.isArray(req.user.permissions) &&
            (req.user.permissions.includes("assign_roles") || req.user.permissions.includes("manage_users")));

        if (!isAuthorized) {
          return res.status(403).json({ message: "Not authorized to modify user role" });
        }

        user.role = cleanRole;
      }
    }

    await user.save();
    return res.status(200).json({
      message: "Profile updated successfully",
      user: safeUser(user)
    });
  } catch (error) {
    console.error("Update profile error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already in use by another account" });
    }
    return res.status(500).json({ message: "Failed to update profile" });
  }
};
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
const updateProfilePhoto = async (req, res) => {
  try {
    const { profilePhoto } = req.body;
    if (profilePhoto === undefined) {
      return res.status(400).json({ message: "No photo provided" });
    }
    const updatePhoto = (profilePhoto === null || profilePhoto === "") ? null : profilePhoto;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePhoto: updatePhoto },
      { new: true, runValidators: false }
    ).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
const updateSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { plan, status, renewalDate, purchaseToken } = req.body;
    const validPlans = ['free', 'starter', 'growth', 'pro', 'business', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ message: "Invalid plan" });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.subscription = {
      plan:          plan          ?? user.subscription?.plan ?? 'free',
      status:        status        ?? 'active',
      renewalDate:   renewalDate   ? new Date(renewalDate) : null,
      purchaseToken: purchaseToken ?? null,
    };
    await user.save();
    return res.status(200).json({ subscription: user.subscription });
  } catch (error) {
    console.error("Update subscription error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
const getSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('subscription');
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ subscription: user.subscription });
  } catch (error) {
    console.error("Get subscription error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
const assignOversightRoles = async (req, res) => {
  try {
    const { id } = req.params;
    const { overseesRoles } = req.body;
    if (!Array.isArray(overseesRoles)) {
      return res.status(400).json({ message: "overseesRoles must be an array" });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.overseesRoles = overseesRoles;
    await user.save();
    return res.status(200).json({ user: safeUser(user) });
  } catch (err) {
    console.error("Assign oversight error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const skipOnboarding = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (!user.onboarding) {
      user.onboarding = { hasSkippedTour: false, hasCreatedProject: false, hasAddedEntry: false };
    }
    user.onboarding.hasSkippedTour = true;
    await user.save();
    
    return res.status(200).json({ user: safeUser(user) });
  } catch (error) {
    console.error("Skip onboarding error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const visitModule = async (req, res) => {
  try {
    const { moduleName } = req.body;
    if (!moduleName) return res.status(400).json({ message: "Module name is required" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (!user.onboarding) {
      user.onboarding = {};
    }
    if (!user.onboarding.visitedModules) {
      user.onboarding.visitedModules = [];
    }

    if (!user.onboarding.visitedModules.includes(moduleName)) {
      user.onboarding.visitedModules.push(moduleName);
      await user.save();
    }
    
    return res.status(200).json({ user: safeUser(user) });
  } catch (error) {
    console.error("Visit module error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { safeUser, updateProfile, updateSubscription, getSubscription, getProfile, updateProfilePhoto, assignOversightRoles, skipOnboarding, visitModule };
