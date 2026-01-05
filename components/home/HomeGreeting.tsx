'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const GREETINGS = {
  morning: [
    "Good morning",
    "Rise and create",
    "Morning",
  ],
  afternoon: [
    "Good afternoon",
    "Afternoon",
  ],
  evening: [
    "Good evening",
    "Evening",
  ],
};

export default function HomeGreeting() {
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
  }, [supabase]);

  return (
    <div className="text-center mb-10">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
        {greeting || 'Hey there'}
        {userName && <span>, {userName}</span>}
      </h1>
    </div>
  );
}
