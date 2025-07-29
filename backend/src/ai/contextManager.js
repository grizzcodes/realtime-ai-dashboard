// backend/src/ai/contextManager.js
class ContextManager {
  constructor() {
    this.context = {
      recentTasks: [],
      activeProjects: new Map(),
      peopleInteractions: new Map(),
      patternHistory: [],
      userPreferences: {},
      systemLearning: {}
    };
  }

  // Add context from new events/tasks
  addContext(event, tasks = []) {
    this.updateRecentTasks(tasks);
    this.updateProjectContext(event, tasks);
    this.updatePeopleContext(event, tasks);
    this.detectPatterns(event, tasks);
  }

  updateRecentTasks(tasks) {
    tasks.forEach(task => {
      this.context.recentTasks.unshift({
        ...task,
        addedAt: new Date()
      });
    });

    // Keep only last 50 tasks
    this.context.recentTasks = this.context.recentTasks.slice(0, 50);
  }

  updateProjectContext(event, tasks) {
    tasks.forEach(task => {
      const projectKey = this.extractProjectKey(task);
      if (projectKey) {
        if (!this.context.activeProjects.has(projectKey)) {
          this.context.activeProjects.set(projectKey, {
            name: projectKey,
            tasks: [],
            lastActivity: new Date(),
            priority: task.urgency,
            stakeholders: new Set(),
            deadlines: []
          });
        }

        const project = this.context.activeProjects.get(projectKey);
        project.tasks.push(task.id);
        project.lastActivity = new Date();
        project.priority = Math.max(project.priority, task.urgency);
        
        if (task.keyPeople) {
          task.keyPeople.forEach(person => project.stakeholders.add(person));
        }
        
        if (task.deadline) {
          project.deadlines.push(task.deadline);
        }
      }
    });
  }

  updatePeopleContext(event, tasks) {
    tasks.forEach(task => {
      if (task.keyPeople) {
        task.keyPeople.forEach(person => {
          if (!this.context.peopleInteractions.has(person)) {
            this.context.peopleInteractions.set(person, {
              name: person,
              interactions: [],
              commonTopics: new Set(),
              urgencyPattern: [],
              lastContact: new Date()
            });
          }

          const personData = this.context.peopleInteractions.get(person);
          personData.interactions.push({
            taskId: task.id,
            source: event.source,
            urgency: task.urgency,
            date: new Date(),
            topic: task.summary
          });
          
          if (task.tags) {
            task.tags.forEach(tag => personData.commonTopics.add(tag));
          }
          
          personData.urgencyPattern.push(task.urgency);
          personData.lastContact = new Date();

          // Keep only last 20 interactions per person
          personData.interactions = personData.interactions.slice(-20);
          personData.urgencyPattern = personData.urgencyPattern.slice(-10);
        });
      }
    });
  }

  detectPatterns(event, tasks) {
    const pattern = {
      timestamp: new Date(),
      source: event.source,
      taskCount: tasks.length,
      avgUrgency: tasks.length > 0 ? tasks.reduce((sum, t) => sum + t.urgency, 0) / tasks.length : 3,
      commonTags: this.getCommonTags(tasks),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };

    this.context.patternHistory.push(pattern);
    
    // Keep only last 100 patterns
    this.context.patternHistory = this.context.patternHistory.slice(-100);
  }

  // Get intelligent context for decision making
  getContextForTask(task) {
    return {
      relatedTasks: this.findRelatedTasks(task),
      involvedPeople: this.getPeopleContext(task.keyPeople),
      projectContext: this.getProjectContext(task),
      historicalPatterns: this.getRelevantPatterns(task),
      urgencyContext: this.getUrgencyContext(task),
      deadlineContext: this.getDeadlineContext(task)
    };
  }

  findRelatedTasks(task) {
    return this.context.recentTasks.filter(recentTask => {
      // Find tasks with overlapping tags, people, or similar content
      const tagOverlap = task.tags?.some(tag => recentTask.tags?.includes(tag)) || false;
      const peopleOverlap = task.keyPeople?.some(person => recentTask.keyPeople?.includes(person)) || false;
      const summaryWords = task.summary.toLowerCase().split(' ');
      const contentSimilarity = summaryWords.some(word => 
        recentTask.summary.toLowerCase().includes(word) && word.length > 4
      );

      return tagOverlap || peopleOverlap || contentSimilarity;
    }).slice(0, 5); // Top 5 related tasks
  }

  getPeopleContext(keyPeople = []) {
    return keyPeople.map(person => {
      const personData = this.context.peopleInteractions.get(person);
      if (!personData) return { name: person, context: 'new_contact' };

      const avgUrgency = personData.urgencyPattern.length > 0 ? 
        personData.urgencyPattern.reduce((a, b) => a + b, 0) / personData.urgencyPattern.length : 3;
      const daysSinceLastContact = Math.floor((new Date() - personData.lastContact) / (1000 * 60 * 60 * 24));

      return {
        name: person,
        avgUrgency: avgUrgency || 3,
        daysSinceLastContact,
        commonTopics: Array.from(personData.commonTopics),
        interactionCount: personData.interactions.length,
        context: this.getPersonContextSummary(personData)
      };
    });
  }

  getProjectContext(task) {
    const projectKey = this.extractProjectKey(task);
    if (!projectKey) return null;

    const project = this.context.activeProjects.get(projectKey);
    if (!project) return null;

    return {
      name: project.name,
      totalTasks: project.tasks.length,
      priority: project.priority,
      stakeholders: Array.from(project.stakeholders),
      nextDeadline: project.deadlines.sort()[0],
      daysSinceLastActivity: Math.floor((new Date() - project.lastActivity) / (1000 * 60 * 60 * 24))
    };
  }

  getRelevantPatterns(task) {
    return this.context.patternHistory.filter(pattern => {
      // Find patterns related to this task's source, tags, or timing
      const sourceMatch = pattern.source === task.source;
      const tagMatch = task.tags?.some(tag => 
        pattern.commonTags.includes(tag)
      ) || false;
      const urgencyMatch = Math.abs(pattern.avgUrgency - task.urgency) <= 1;
      
      return sourceMatch || tagMatch || urgencyMatch;
    }).slice(-5); // Last 5 relevant patterns
  }

  getUrgencyContext(task) {
    const recentUrgencies = this.context.recentTasks
      .filter(t => t.source === task.source)
      .map(t => t.urgency)
      .slice(0, 10);

    const avgUrgency = recentUrgencies.length > 0 ? 
      recentUrgencies.reduce((a, b) => a + b, 0) / recentUrgencies.length : 3;
    
    return {
      isAboveAverage: task.urgency > avgUrgency,
      sourceAverageUrgency: avgUrgency,
      recommendation: task.urgency >= 4 ? 'immediate_attention' : 
                     task.urgency >= 3 ? 'schedule_soon' : 'routine_handling'
    };
  }

  getDeadlineContext(task) {
    if (!task.deadline) return null;

    const deadline = new Date(task.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    // Find other tasks with similar deadlines
    const conflictingTasks = this.context.recentTasks.filter(t => {
      if (!t.deadline) return false;
      const otherDeadline = new Date(t.deadline);
      const daysDiff = Math.abs((deadline - otherDeadline) / (1000 * 60 * 60 * 24));
      return daysDiff <= 2 && t.id !== task.id;
    });

    return {
      daysUntilDeadline,
      urgencyLevel: daysUntilDeadline <= 1 ? 'critical' :
                   daysUntilDeadline <= 3 ? 'urgent' :
                   daysUntilDeadline <= 7 ? 'soon' : 'planned',
      conflictingTasks: conflictingTasks.slice(0, 3),
      recommendation: this.getDeadlineRecommendation(daysUntilDeadline, conflictingTasks.length)
    };
  }

  // Smart suggestions based on context
  generateSmartSuggestions() {
    const suggestions = [];

    // Overdue task suggestions
    const overdueTasks = this.getOverdueTasks();
    if (overdueTasks.length > 0) {
      suggestions.push({
        type: 'overdue_alert',
        priority: 'high',
        message: `You have ${overdueTasks.length} overdue tasks`,
        action: 'review_overdue_tasks',
        data: overdueTasks
      });
    }

    // Upcoming deadline warnings
    const upcomingDeadlines = this.getUpcomingDeadlines();
    if (upcomingDeadlines.length > 0) {
      suggestions.push({
        type: 'deadline_warning',
        priority: 'medium',
        message: `${upcomingDeadlines.length} deadlines approaching`,
        action: 'prepare_for_deadlines',
        data: upcomingDeadlines
      });
    }

    // People follow-up suggestions
    const followUpSuggestions = this.generateFollowUpSuggestions();
    suggestions.push(...followUpSuggestions);

    return suggestions;
  }

  // Helper methods
  extractProjectKey(task) {
    // Extract project identifier from tags, summary, or other indicators
    const projectIndicators = ['project', 'campaign', 'launch', 'initiative'];
    
    for (const tag of task.tags || []) {
      if (projectIndicators.some(indicator => tag.toLowerCase().includes(indicator))) {
        return tag;
      }
    }

    // Extract from summary
    const words = task.summary.toLowerCase().split(' ');
    for (const word of words) {
      if (word.length > 6 && !['meeting', 'review', 'update'].includes(word)) {
        return word;
      }
    }

    return null;
  }

  getCommonTags(tasks) {
    const tagCounts = {};
    tasks.forEach(task => {
      task.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  getPersonContextSummary(personData) {
    const avgUrgency = personData.urgencyPattern.length > 0 ?
      personData.urgencyPattern.reduce((a, b) => a + b, 0) / personData.urgencyPattern.length : 3;
    const daysSinceLastContact = Math.floor((new Date() - personData.lastContact) / (1000 * 60 * 60 * 24));

    if (daysSinceLastContact > 7) return 'needs_follow_up';
    if (avgUrgency >= 4) return 'high_priority_contact';
    if (personData.interactions.length > 10) return 'frequent_collaborator';
    return 'regular_contact';
  }

  getDeadlineRecommendation(daysUntilDeadline, conflictCount) {
    if (daysUntilDeadline <= 1) return 'drop_everything_focus';
    if (daysUntilDeadline <= 3 && conflictCount > 0) return 'prioritize_and_delegate';
    if (daysUntilDeadline <= 7) return 'start_preparation';
    return 'monitor_progress';
  }

  getOverdueTasks() {
    const now = new Date();
    return this.context.recentTasks.filter(task => {
      if (!task.deadline) return false;
      return new Date(task.deadline) < now && task.status === 'pending';
    });
  }

  getUpcomingDeadlines() {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return this.context.recentTasks.filter(task => {
      if (!task.deadline) return false;
      const deadline = new Date(task.deadline);
      return deadline > now && deadline <= weekFromNow && task.status === 'pending';
    });
  }

  generateFollowUpSuggestions() {
    const suggestions = [];
    
    this.context.peopleInteractions.forEach((personData, person) => {
      const daysSinceLastContact = Math.floor((new Date() - personData.lastContact) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastContact > 7 && personData.interactions.length > 3) {
        suggestions.push({
          type: 'follow_up_suggestion',
          priority: 'low',
          message: `Follow up with ${person}`,
          action: 'suggest_follow_up',
          data: { person, daysSinceLastContact, lastTopics: Array.from(personData.commonTopics) }
        });
      }
    });

    return suggestions.slice(0, 3); // Top 3 follow-up suggestions
  }

  // Get context summary for AI processing
  getAIContext() {
    return {
      recentTasksCount: this.context.recentTasks.length,
      activeProjectsCount: this.context.activeProjects.size,
      frequentCollaborators: Array.from(this.context.peopleInteractions.entries())
        .filter(([_, data]) => data.interactions.length > 5)
        .map(([name]) => name),
      currentWorkload: this.calculateWorkload(),
      upcomingDeadlines: this.getUpcomingDeadlines().length,
      overdueTasks: this.getOverdueTasks().length
    };
  }

  calculateWorkload() {
    const pendingTasks = this.context.recentTasks.filter(t => t.status === 'pending');
    const urgentTasks = pendingTasks.filter(t => t.urgency >= 4);
    
    return {
      total: pendingTasks.length,
      urgent: urgentTasks.length,
      level: urgentTasks.length > 5 ? 'high' : 
             urgentTasks.length > 2 ? 'medium' : 'manageable'
    };
  }
}

module.exports = ContextManager;