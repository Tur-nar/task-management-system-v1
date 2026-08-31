require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./src/utils/logger');
const { sequelize, User, Department, Performance } = require('./src/models');
const { initCronJobs } = require('./src/jobs/cron');

const app = express();

// ──────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan('short', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// ──────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DB_DIALECT || 'sqlite',
    timestamp: new Date().toISOString(),
  });
});

// ──────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/departments', require('./src/routes/department.routes'));
// Nested task resources — must be registered before the main task routes
app.use('/api/tasks/:taskId/subtasks', require('./src/routes/subtask.routes'));
app.use('/api/tasks/:taskId/comments', require('./src/routes/taskcomment.routes'));
app.use('/api/tasks', require('./src/routes/task.routes'));
app.use('/api/targets', require('./src/routes/target.routes'));
app.use('/api/performance', require('./src/routes/performance.routes'));
app.use('/api/notifications', require('./src/routes/notification.routes'));
app.use('/api/complaints', require('./src/routes/complaint.routes'));

// ──────────────────────────────────────────────
// 404 handler
// ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found.` });
});

// ──────────────────────────────────────────────
// Global error handler
// ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  logger.error(err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

// ──────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;

const syncDb = async () => {
  const isSqlite = !process.env.DB_DIALECT || process.env.DB_DIALECT === 'sqlite';
  if (isSqlite) {
    // SQLite: plain sync (create missing tables only). alter:true causes backup-table
    // collisions on retried startups, triggering false unique-constraint errors.
    // To apply schema changes in dev, delete database.sqlite and restart.
    await sequelize.sync();
  } else {
    await sequelize.sync({ alter: true });
  }
};

syncDb()
  .then(async () => {
    logger.info(`Database synced (${process.env.DB_DIALECT || 'sqlite'}).`);

    // Automatically seed default data if database is completely empty
    try {
      const usersCount = await User.count();
      if (usersCount === 0) {
        logger.info('Database is empty. Automatically seeding default credentials...');
        
        await Department.bulkCreate([
          { name: 'Marketing', description: 'Brand management, campaigns, and lead generation' },
          { name: 'Development', description: 'Software development and infrastructure management' },
        ]);

        const superAdmin = await User.create({
          firstName: process.env.SUPER_ADMIN_FIRST_NAME || 'Feyisara',
          lastName: process.env.SUPER_ADMIN_LAST_NAME || 'Ogunranti',
          email: process.env.SUPER_ADMIN_EMAIL || 'f.ogunranti@msspaceglobal.com',
          password: process.env.SUPER_ADMIN_PASSWORD || 'MSSpace@2026!',
          role: 'super_admin',
          status: 'active',
        });

        await Performance.create({
          userId: superAdmin.id,
          tasksCompleted: 0,
          tasksOnTime: 0,
          tasksLate: 0,
          totalTasksAssigned: 0,
          performanceScore: 100,
          rating: 'excellent',
        });

        logger.info(`Default Super Admin created: ${superAdmin.email}`);
      }
    } catch (err) {
      logger.error(`Error during auto-seeding: ${err.message}`);
    }

    // Initialize cron jobs
    initCronJobs();

    app.listen(PORT, () => {
      logger.info(`🚀 TaskManager Pro API running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  });
