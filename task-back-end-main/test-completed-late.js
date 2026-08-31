const { Task, User } = require('./src/models');

async function test() {
  try {
    const overdueTask = await Task.findOne({ where: { status: 'overdue' } });
    if (!overdueTask) {
      console.log('No overdue task found');
      return;
    }
    
    console.log('Found task:', overdueTask.id, 'status:', overdueTask.status);
    
    // Simulate updating
    let finalStatus = 'completed';
    if (finalStatus === 'completed' && overdueTask.status === 'overdue') {
      finalStatus = 'completed_late';
    }
    
    await overdueTask.update({ status: finalStatus, completedAt: new Date() });
    
    console.log('Task updated, new status:', overdueTask.status);
    
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

test();
