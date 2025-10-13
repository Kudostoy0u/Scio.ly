export const CHART_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
  '#43e97b', '#38f9d7', '#fa709a', '#fee140', '#a8edea', '#fed6e3'
];

export interface ChartConfig {
  type: 'line';
  data: {
    labels?: string[];
    datasets: Array<{
      label: string;
      data: (number | null)[] | Array<{ x: Date; y: number; tournament: string; duosmiumLink: string }>;
      borderColor: string;
      backgroundColor: string;
      borderWidth: number;
      fill: boolean;
      tension: number;
      pointRadius?: number;
      pointHoverRadius?: number;
    }>;
  };
  options: any;
}

export interface RangeFilter {
  startIndex: number;
  endIndex: number;
}
