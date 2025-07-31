        if (data.needsAuth && (name === 'Gmail' || name === 'Calendar')) {
          if (window.confirm(`${name} requires OAuth setup. Click OK to authenticate now.`)) {
            window.open('http://localhost:3002/auth/google', '_blank');
          }
        } else {export default App;
