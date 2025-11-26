'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const SPACE_GREETINGS = {
  morning: [
    "Orbit established",
    "Systems online",
    "Ready for liftoff",
    "Morning star shining",
    "Good morning, Commander",
    "Sensors are clear",
    "Initiating launch sequence",
    "Sun's up, shields up",
    "Dawn on the horizon",
    "Fuel cells charged",
    "Atmospheric entry complete",
    "Rebooting life support",
    "Coffee nebula detected",
    "Primary ignition sequence start",
    "T-minus zero for a great day",
    "Solar panels deploying",
    "Morning report: All systems nominal",
    "Gravity stabilizers online",
    "Waking up the ship's AI",
    "Scanning for intelligent life... found you",
    "Daylight sensors active",
    "Thrusters warming up",
    "New mission objectives loaded",
    "Hyperdrive online",
    "Stellar forecast: Bright",
    "Charging ion cannons",
    "Morning maneuvers authorized"
  ],
  afternoon: [
    "Orbit steady",
    "Mid-mission check",
    "Systems optimal",
    "Good afternoon, Explorer",
    "Cruising altitude reached",
    "Solar arrays at max capacity",
    "Trajectory nominal",
    "Deep space telemetry active",
    "Afternoon maneuver complete",
    "Maintaining steady course",
    "Mid-orbit refueling recommended",
    "Solar wind at your back",
    "Maintaining velocity",
    "Hyperdrive cooling down",
    "Sector 7 looks clear",
    "Quantum flux stable",
    "Lunch rations consumed?",
    "Halfway to the event horizon",
    "Calculating trajectory for the rest of the day",
    "Starboard thrusters holding steady",
    "Asteroid field cleared",
    "Navigating the nebula",
    "Deflector shields holding",
    "Scanning for afternoon snacks",
    "Light speed ahead"
  ],
  evening: [
    "Entering night cycle",
    "Stars are bright tonight",
    "Evening docking complete",
    "Good evening, Cadet",
    "Mission control standby",
    "Scanning the constellations",
    "Night shift active",
    "Moon rising, systems cooling",
    "Restoring power levels",
    "Engaging night mode",
    "Engaging cloaking device",
    "Docking procedures initiated",
    "Mission logs updated",
    "Prepare for rest cycle",
    "Night watch beginning",
    "Scanning dark matter",
    "Constellation mapping in progress",
    "Powering down non-essential systems",
    "The galaxy sleeps",
    "Moon base reporting in",
    "Stargazing protocols active",
    "Signal dampeners on",
    "Orbiting the dark side",
    "Running evening diagnostics",
    "Safe harbor reached",
    "Lightspeed disengaged"
  ],
  anytime: [
    "Welcome to the bridge",
    "All systems go",
    "Ready to explore",
    "Greetings, Earthling",
    "Stellar to see you",
    "Welcome back, Pilot",
    "Communications open",
    "Radar clear",
    "Warp drive standby",
    "Hello from the stars",
    "Hailing frequencies open",
    "Welcome aboard, Captain",
    "Shields at 100%",
    "Intergalactic comms active",
    "Warp speed available",
    "Sensors picking up brilliance",
    "Teleporter room ready",
    "Zero G detected",
    "Universal translator online",
    "Checking starmaps",
    "Phasers set to stunning",
    "In a galaxy near you",
    "Space: the final frontier",
    "Coordinates locked",
    "Course plotted",
    "Engage!",
    "Scanning frequencies",
    "Welcome to the mothership",
    "Gravity is normal",
    "Hull integrity: 100%",
    "Life support is stable",
    "Welcome back to base",
    "Docking successful"
  ]
};

export default function DashboardHeader() {
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      let options: string[] = [];

      // Combine specific time of day greetings with generic ones
      if (hour < 12) {
        options = [...SPACE_GREETINGS.morning, ...SPACE_GREETINGS.anytime];
      } else if (hour < 18) {
        options = [...SPACE_GREETINGS.afternoon, ...SPACE_GREETINGS.anytime];
      } else {
        options = [...SPACE_GREETINGS.evening, ...SPACE_GREETINGS.anytime];
      }

      // Select a random greeting
      const randomIndex = Math.floor(Math.random() * options.length);
      setGreeting(options[randomIndex]);
    };

    updateGreeting();
    
    // Update greeting occasionally (e.g., every hour) just in case they leave it open, 
    // but we don't need to spam random changes every minute.
    const interval = setInterval(updateGreeting, 60 * 60 * 1000); 

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get full name from metadata or profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
          
        if (profile?.full_name) {
          setUserName(profile.full_name.split(' ')[0]); // First name
        } else {
          setUserName(user.email?.split('@')[0] || 'there');
        }
      }
    };

    getUser();

    return () => clearInterval(interval);
  }, [supabase]);

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {today}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          {greeting ? (
            <>
              {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">{userName}</span>
            </>
          ) : (
            // Fallback skeleton or empty space to prevent layout shift
            <span className="opacity-0">Loading...</span>
          )}
        </h1>
      </div>
    </div>
  );
}
