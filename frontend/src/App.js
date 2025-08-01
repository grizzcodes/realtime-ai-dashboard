  const getResponseStatusColor = (status) => {
    switch(status) {
      case 'accepted': return 'text-green-600';
      case 'declined': return 'text-red-600';
      case 'tentative': return 'text-yellow-600';
      case 'needsAction': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  };

  const getResponseStatusIcon = (status) => {
    switch(status) {
      case 'accepted': return '✅';
      case 'declined': return '❌';
      case 'tentative': return '❓';
      case 'needsAction': return '⏳';
      default: return '👤';
    }
  };