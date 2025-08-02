import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, MailQuestion, Clock4 } from 'lucide-react';

export default function MagicInbox() {
  const [data, setData] = useState({
    replySuggestions: [],
    quickWins: [],
    upcomingTasks: [],
    waitingOn: []
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMagicInbox = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/ai/magic-inbox');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (error) {
        console.error('Failed to load Magic Inbox:', error);
        // Set demo data for now
        setData({
          replySuggestions: [
            "Sarah from Marketing: Campaign review feedback needed",
            "Client inquiry about project timeline",
            "Team lead waiting on budget approval"
          ],
          quickWins: [
            "Approve vacation request (30 sec)",
            "Reply 'thanks' to completed deliverable",
            "Schedule coffee chat with new hire"
          ],
          upcomingTasks: [
            "Prepare slides for 3PM meeting",
            "Review contract before client call",
            "Update project status for standup"
          ],
          waitingOn: [
            "Legal review from 3 days ago",
            "Budget approval sent Monday",
            "Meeting confirmation from vendor"
          ]
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchMagicInbox();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="opacity-70">AI is reading your digital life...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-glow mb-2">✨ Magic AI Inbox</h1>
        <p className="opacity-70">Your AI assistant has analyzed everything. Here's what matters now.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section 
          icon={<MailQuestion className="text-yellow-400" />} 
          title="🔔 You Should Reply To..." 
          items={data.replySuggestions}
          color="yellow"
        />
        <Section 
          icon={<Sparkles className="text-green-400" />} 
          title="⚡ Quick Wins" 
          items={data.quickWins}
          color="green"
        />
        <Section 
          icon={<Calendar className="text-blue-400" />} 
          title="📆 Upcoming + Undone" 
          items={data.upcomingTasks}
          color="blue"
        />
        <Section 
          icon={<Clock4 className="text-orange-400" />} 
          title="👀 Waiting On..." 
          items={data.waitingOn}
          color="orange"
        />
      </div>
    </div>
  );
}

function Section({ title, items, icon, color }) {
  return (
    <div className="card-glass p-6 animate-fade-in">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        {icon} 
        <span className="text-glow">{title}</span>
      </h2>
      {items.length === 0 ? (
        <p className="opacity-50 text-sm text-center py-8">
          Nothing here 🎉<br/>
          <span className="text-xs">Your AI assistant is keeping you organized!</span>
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="task-card p-3 hover:bg-opacity-80 cursor-pointer transition-all">
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 bg-${color}-400 animate-pulse`}></div>
                <span className="text-sm flex-1">{item}</span>
                <button className="btn-glass px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Act
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
