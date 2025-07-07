import { supabase } from '@/lib/supabase';
import { addDays, endOfDay, format, isAfter, parseISO } from 'date-fns';
import { Alert } from 'react-native';

type DailySchedule = {
  id?: number;
  type: 'daily';
  times: string[];
};

type WeeklySchedule = {
  id?: number;
  type: 'weekly';
  days: string[];
  times: string[];
};

type IntervalSchedule = {
  id?: number;
  type: 'interval';
  interval_days: number;
  times: string[];
};

type Schedule = DailySchedule | WeeklySchedule | IntervalSchedule;

type Medication = {
  id: string;
  name: string;
  dosage: string;
  created_at: string;
  senior_id: string;
  schedule: Schedule;
};

function to24Hour(timeStr: string): string {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s?(am|pm)$/i);
  if (!match) throw new Error(`Invalid time format: "${timeStr}"`);
  const [, hoursStr, minutes, meridian] = match;
  let hours = parseInt(hoursStr, 10);
  if (meridian.toLowerCase() === 'pm' && hours !== 12) hours += 12;
  if (meridian.toLowerCase() === 'am' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

export default async function MakeUserSchedule(): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const senior_id = userData?.user?.id;

  if (!senior_id || userError) {
    Alert.alert('Auth Error', 'Unable to fetch user information.');
    return;
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from('medications')
    .select('*')
    .eq('senior_id', senior_id);

  const { data: existingDoseLogs, error: logError } = await supabase
    .from('dose_logs')
    .select('medication_id, scheduled_time')
    .eq('senior_id', senior_id);

  if (scheduleError || logError) {
    Alert.alert('Database Error', 'Failed to load schedule or logs.');
    return;
  }

  const today = new Date();
  const endToday = endOfDay(today);

  const futureLogsMap = new Map<string, boolean>();
  existingDoseLogs?.forEach((log) => {
    const scheduledDate = parseISO(log.scheduled_time);
    if (isAfter(scheduledDate, today) || scheduledDate.toDateString() === today.toDateString()) {
      futureLogsMap.set(log.medication_id, true);
    }
  });

  for (const med of schedule || []) {
    if (futureLogsMap.has(med.id)) continue;

    try {
      const occurrences: { date: string; time: string }[] = [];

      if (med.schedule.type === 'daily') {
        const dateStr = format(today, 'yyyy-MM-dd');
        med.schedule.times.forEach((t: any) => {
          occurrences.push({ date: dateStr, time: to24Hour(t) });
        });
      }

      if (med.schedule.type === 'weekly') {
        med.schedule.days.forEach((day: any) => {
          const weekdayIndex = [
            'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
          ].indexOf(day);

          if (weekdayIndex === -1) return;

          const offset = (weekdayIndex - today.getDay() + 7) % 7;
          const nextDate = addDays(today, offset);
          const dateStr = format(nextDate, 'yyyy-MM-dd');

          med.schedule.times.forEach((t: any) => {
            occurrences.push({ date: dateStr, time: to24Hour(t) });
          });
        });
      }

      if (med.schedule.type === 'interval') {
        const nextDate = addDays(today, med.schedule.interval_days);
        const dateStr = format(nextDate, 'yyyy-MM-dd');

        med.schedule.times.forEach((t: any) => {
          occurrences.push({ date: dateStr, time: to24Hour(t) });
        });
      }

      for (const { date, time } of occurrences) {
        const scheduled_time = `${date} ${time}`;

        const { error: insertError } = await supabase.from('dose_logs').insert({
          medication_id: med.id,
          senior_id,
          scheduled_time,
          status: 'scheduled',
          taken_time: null,
          synced_at: new Date()
        });

        if (insertError) {
          console.error(`Insert error for med ${med.id}:`, insertError);
        }
      }

    } catch (e: any) {
      Alert.alert('Schedule Error', e.message || 'Invalid schedule data');
    }
  }
}
