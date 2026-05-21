import { logger } from '../../config/logger';
import { ScheduleRepository } from './schedule.repository';
import { ScheduleService } from './schedule.service';
import { ContentRepository } from '../content/content.repository';

const POLL_INTERVAL_MS = 60_000;

export class SchedulePoller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private scheduleRepo = new ScheduleRepository();
  private service = new ScheduleService(this.scheduleRepo, new ContentRepository());

  start(): void {
    logger.info(`Schedule poller started (interval: ${POLL_INTERVAL_MS}ms)`);
    this.poll();
    this.intervalId = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Schedule poller stopped');
    }
  }

  private async poll(): Promise<void> {
    try {
      const configs = await this.scheduleRepo.getActiveSchedules();

      for (const config of configs) {
        try {
          await this.checkAndExecute(config);
        } catch (error: any) {
          logger.error('Schedule poll failed for tenant', {
            tenantId: config.tenantId,
            error: error.message,
          });
        }
      }
    } catch (error: any) {
      logger.error('Schedule poll cycle failed', { error: error.message });
    }
  }

  private async checkAndExecute(config: {
    tenantId: string;
    postsPerDay: number;
    timeOfDay: string;
    timezone: string;
  }): Promise<void> {
    const now = this.getNowInTimezone(config.timezone);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Parse timeOfDay (HH:mm)
    const [startHour, startMinute] = config.timeOfDay.split(':').map(Number);

    // Calculate slot times for today
    const slots = this.calculateSlotTimes(startHour, startMinute, config.postsPerDay);

    // How many slots have elapsed?
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMinutes = currentHour * 60 + currentMinute;

    let dueSlots = 0;
    for (const slot of slots) {
      if (currentMinutes >= slot) {
        dueSlots++;
      }
    }

    if (dueSlots === 0) return;

    // Count how many posts already processed today
    // Convert todayStart back to UTC for DB query
    const todayStartUtc = this.toUtcFromTimezone(todayStart, config.timezone);
    const processedToday = await this.scheduleRepo.countProcessedToday(
      config.tenantId,
      todayStartUtc,
    );

    const postsNeeded = dueSlots - processedToday;

    if (postsNeeded <= 0) return;

    logger.info(`Schedule: ${postsNeeded} post(s) due for tenant ${config.tenantId}`);

    // Execute one post at a time per poll tick to avoid overwhelming
    const executed = await this.service.executeNextPost(config.tenantId);
    if (executed) {
      logger.info('Schedule: post triggered', { tenantId: config.tenantId });
    }
  }

  /**
   * Calculate slot times in minutes from midnight.
   * E.g., postsPerDay=3, startHour=9, startMinute=0 → [540, 840, 1140] (09:00, 14:00, 19:00)
   */
  private calculateSlotTimes(startHour: number, startMinute: number, postsPerDay: number): number[] {
    const startMinutes = startHour * 60 + startMinute;

    if (postsPerDay === 1) {
      return [startMinutes];
    }

    // Spread posts evenly from startTime to end of day (23:59)
    const endMinutes = 23 * 60 + 59;
    const availableWindow = endMinutes - startMinutes;
    const interval = Math.floor(availableWindow / postsPerDay);

    const slots: number[] = [];
    for (let i = 0; i < postsPerDay; i++) {
      slots.push(startMinutes + i * interval);
    }
    return slots;
  }

  /**
   * Get the current time as a Date object representing local time in the given timezone.
   */
  private getNowInTimezone(timezone: string): Date {
    const nowUtc = new Date();
    const tzString = nowUtc.toLocaleString('en-US', { timeZone: timezone });
    return new Date(tzString);
  }

  /**
   * Convert a "local" Date (representing time in a timezone) back to UTC.
   */
  private toUtcFromTimezone(localDate: Date, timezone: string): Date {
    // Get the offset by comparing UTC representation in the timezone
    const utcNow = new Date();
    const utcString = utcNow.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzString = utcNow.toLocaleString('en-US', { timeZone: timezone });
    const offsetMs = new Date(tzString).getTime() - new Date(utcString).getTime();
    return new Date(localDate.getTime() - offsetMs);
  }
}

export const schedulePoller = new SchedulePoller();
