const { pool } = require('../db');

async function runPriorityShift() {
  console.log('Priority CIC: Running scan...');
  const urgencyThresholdDays = parseInt(process.env.URGENCY_THRESHOLD_DAYS || '15', 10);

  try {
    // Find tasks: not urgent, deadline <= NOW() + 15 days
    // Postgres interval syntax: "15 days"
    const query = `
      UPDATE tasks
      SET is_urgent = TRUE
      WHERE is_urgent = FALSE
      AND deadline <= NOW() + interval '${urgencyThresholdDays} days'
      RETURNING id, title;
    `;

    const result = await pool.query(query);

    if (result.rowCount > 0) {
      console.log(`Priority CIC: Перемещено ${result.rowCount} задач в статус СРОЧНО.`);
      result.rows.forEach(task => {
          console.log(` - Shifted Task ID ${task.id}: ${task.title}`);
      });
    } else {
      console.log('Priority CIC: No tasks shifted.');
    }

  } catch (error) {
    console.error('Priority CIC Error:', error);
  }
}

function startPriorityService() {
  const intervalMinutes = parseInt(process.env.CIC_CHECK_INTERVAL_MINUTES || '60', 10);
  console.log(`Starting Priority CIC Service. Interval: ${intervalMinutes} minutes.`);

  // Initial run
  runPriorityShift();

  // Schedule
  setInterval(runPriorityShift, intervalMinutes * 60 * 1000);
}

module.exports = {
  startPriorityService,
  runPriorityShift
};
