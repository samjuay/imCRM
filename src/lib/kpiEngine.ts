/**
 * KPI Calculation Engine
 * Modular, reusable, and extendable for future phases (Attendance, WhatsApp, payroll, etc.)
 */

export interface KPIMetric {
  id: string;
  name: string;
  weight: number; // e.g., 0.5 for site visit planned, 6.5 for completed
  getValue: (data: any) => number;
}

export interface KPIDataInput {
  visitsPlanned: number;
  visitsCompleted: number;
  bookingsCount: number;
  revenueGenerated: number;
}

export class KPIEngine {
  private metrics: KPIMetric[] = [];

  constructor() {
    // Phase 2 Metrics Configuration
    this.registerMetric({
      id: 'visits_completed',
      name: 'Site Visit Completed',
      weight: 6.5,
      getValue: (data: KPIDataInput) => data.visitsCompleted
    });
  }

  /**
   * Register a new metric dynamically (for future extensions)
   */
  registerMetric(metric: KPIMetric) {
    this.metrics.push(metric);
  }

  /**
   * Computes the final KPI score based on registered metrics
   */
  calculateKPI(data: KPIDataInput): {
    score: number;
    metricsDetails: { id: string; name: string; value: number; contribution: number }[];
  } {
    let totalScore = 0;
    const details = this.metrics.map(metric => {
      const val = metric.getValue(data) || 0;
      const contribution = val * metric.weight;
      totalScore += contribution;
      return {
        id: metric.id,
        name: metric.name,
        value: val,
        contribution: Number(contribution.toFixed(2))
      };
    });

    return {
      score: Number(Math.min(100, totalScore).toFixed(2)),
      metricsDetails: details
    };
  }

  /**
   * Retrieves motivational status based on score
   */
  getMotivationalStatus(score: number): 'Excellent' | 'On Track' | 'Needs Attention' | 'Critical' {
    if (score >= 80) return 'Excellent';
    if (score >= 50) return 'On Track';
    if (score >= 25) return 'Needs Attention';
    return 'Critical';
  }

  /**
   * Dynamic colors for motivational status UI badges
   */
  getMotivationalColor(status: string) {
    switch (status) {
      case 'Excellent':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' };
      case 'On Track':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700' };
      case 'Needs Attention':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' };
      default:
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700' };
    }
  }

  /**
   * Retrieves performance rank name
   */
  getPerformanceRank(score: number): string {
    if (score >= 95) return 'Elite Star (A+)';
    if (score >= 80) return 'Gold Performer (A)';
    if (score >= 60) return 'Silver Performer (B+)';
    if (score >= 45) return 'Active Performer (B)';
    if (score >= 25) return 'Needs Push (C)';
    return 'Trial Period (D)';
  }

  /**
   * Calculates target projections and estimated date to reach 100% KPI
   */
  getEstimatedCompletion(score: number, startDateStr: string, endDateStr: string): {
    estimatedDate: string;
    estimatedValueAtEnd: number;
    status: 'Achieved' | 'On Track' | 'Lagging' | 'No Activity';
  } {
    if (score >= 100) {
      return {
        estimatedDate: 'Target Achieved!',
        estimatedValueAtEnd: 100,
        status: 'Achieved'
      };
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const today = new Date();
    
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const daysPassed = Math.max(1, Math.min(totalDays, Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1));
    
    const dailyRate = score / daysPassed;
    const estimatedValueAtEnd = Math.min(100, Number((dailyRate * totalDays).toFixed(1)));
    
    if (dailyRate <= 0) {
      return {
        estimatedDate: 'No active performance log',
        estimatedValueAtEnd: 0,
        status: 'No Activity'
      };
    }
    
    const daysNeeded = 100 / dailyRate;
    const targetDate = new Date(start.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
    
    let estimatedDate = '';
    if (targetDate.getTime() > end.getTime()) {
      estimatedDate = `Est. ${targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} (Lagging)`;
    } else {
      estimatedDate = targetDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    return {
      estimatedDate,
      estimatedValueAtEnd,
      status: targetDate.getTime() <= end.getTime() ? 'On Track' : 'Lagging'
    };
  }
}

export const kpiEngine = new KPIEngine();
