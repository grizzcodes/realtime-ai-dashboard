class TaskManager {
  constructor() {
    this.tasks = [];
  }

  addTask(task) {
    this.tasks.push(task);
    return task;
  }

  getAllTasks() {
    return this.tasks;
  }

  getTaskById(id) {
    return this.tasks.find(task => task.id === id);
  }

  updateTask(id, updates) {
    const taskIndex = this.tasks.findIndex(task => task.id === id);
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
      return this.tasks[taskIndex];
    }
    return null;
  }

  deleteTask(id) {
    const taskIndex = this.tasks.findIndex(task => task.id === id);
    if (taskIndex !== -1) {
      return this.tasks.splice(taskIndex, 1)[0];
    }
    return null;
  }

  clearTasksBySource(source) {
    this.tasks = this.tasks.filter(task => task.source !== source);
  }

  getTasksByStatus(status) {
    return this.tasks.filter(task => task.status === status);
  }

  getTasksByAssignee(assignee) {
    return this.tasks.filter(task => task.assignee === assignee);
  }
}

module.exports = TaskManager;
