  calendar: async () => {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      return { success: false, error: 'Google Calendar requires OAuth setup' };
    }
    return { success: true, message: 'Calendar OAuth configured' };
  },