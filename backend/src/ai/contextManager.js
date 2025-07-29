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