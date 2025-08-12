// Test script to check Supabase data retrieval
const SUPABASE_URL = 'https://goecucoqhsedhilvwxeg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZWN1Y29xaHNlZGhpbHZ3eGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NjQ0MzIsImV4cCI6MjA3MDU0MDQzMn0.CYT8U5phPd7wA4qo5wUQsbxpvWju2fnMAXKdZSWiyTw';

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

async function testSupabase() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((now.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
  const season = now.getMonth() >= 2 && now.getMonth() <= 7 ? 'summer' : 'winter';
  
  console.log('🔍 Testing Supabase with:', {
    date: now.toDateString(),
    weekNumber,
    season,
    hostel: 'BH1'
  });

  try {
    // Test current week
    const response = await fetch(`${SUPABASE_URL}/rest/v1/weekly_menus?hostel=eq.BH1&season=eq.${season}&week=eq.${weekNumber}`, {
      headers
    });
    
    const data = await response.json();
    console.log('📊 Current week data:', {
      status: response.status,
      dataLength: data.length,
      hasData: data.length > 0,
      data: data
    });

    // Test week 1 (which should have data)
    const responseWeek1 = await fetch(`${SUPABASE_URL}/rest/v1/weekly_menus?hostel=eq.BH1&season=eq.${season}&week=eq.1`, {
      headers
    });
    
    const dataWeek1 = await responseWeek1.json();
    console.log('📊 Week 1 data:', {
      status: responseWeek1.status,
      dataLength: dataWeek1.length,
      hasData: dataWeek1.length > 0,
      data: dataWeek1
    });

  } catch (error) {
    console.error('❌ Error testing Supabase:', error);
  }
}

testSupabase();
