require("dotenv").config();
const { sequelize, User, Department, Performance } = require("../models");
const logger = require("../utils/logger");

async function seed() {
  try {
    logger.info("Starting database seed...");

    await sequelize.sync({ force: true });
    logger.info("Database synced.");

    // const departments = await Department.bulkCreate([
    //   { name: 'Marketing', description: 'Brand management, campaigns, and lead generation' },
    //   { name: 'Development', description: 'Software development and infrastructure management' },
    // ]);
    // logger.info(`Created ${departments.length} departments.`);

    const superAdmin = await User.create({
      firstName: process.env.SUPER_ADMIN_FIRST_NAME || "John",
      lastName: process.env.SUPER_ADMIN_LAST_NAME || "Doe",
      email: process.env.SUPER_ADMIN_EMAIL || "admin@yourorg.com",
      password: process.env.SUPER_ADMIN_PASSWORD || "Password123!",
      role: "super_admin",
      status: "active",
    });
    logger.info(`Super admin created: ${superAdmin.email}`);

    // ── Create initial performance record for super admin ──
    await Performance.create({
      userId: superAdmin.id,
      tasksCompleted: 0,
      tasksOnTime: 0,
      tasksLate: 0,
      totalTasksAssigned: 0,
      performanceScore: 100,
      rating: "excellent",
    });

    logger.info("Seed completed successfully!");
    logger.info("─────────────────────────────────────");
    logger.info(`Super Admin Email: ${superAdmin.email}`);
    logger.info(
      `Super Admin Password: ${process.env.SUPER_ADMIN_PASSWORD || "Password123!"}`,
    );
    logger.info("─────────────────────────────────────");

    process.exit(0);
  } catch (error) {
    logger.error(`Seed failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

seed();
