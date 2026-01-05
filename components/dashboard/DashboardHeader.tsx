'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const GREETINGS = {
  morning: [
    "Good morning",
    "Rise and create",
    "Fresh start",
    "Morning",
  ],
  afternoon: [
    "Good afternoon",
    "Afternoon",
    "Keep creating",
  ],
  evening: [
    "Good evening",
    "Evening",
    "Wind down",
  ],
};

export default function DashboardHeader() {
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      let options: string[];

      if (hour < 12) {
        options = GREETINGS.morning;
      } else if (hour < 18) {
        options = GREETINGS.afternoon;
      } else {
        options = GREETINGS.evening;
      }

      const randomIndex = Math.floor(Math.random() * options.length);
      setGreeting(options[randomIndex]);
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60 * 60 * 1000); 

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
          
        if (profile?.full_name) {
          setUserName(profile.full_name.split(' ')[0]);
        } else {
          setUserName(user.email?.split('@')[0] || '');
        }
      }
    };

    getUser();
    return () => clearInterval(interval);
  }, [supabase]);

  return (
    <div className="mb-6">
      <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">
        {greeting || 'Hello'}
        {userName && <span className="text-gray-400 dark:text-gray-500">, {userName}</span>}
      </h1>
    </div>
  );
}
