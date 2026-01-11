'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartWidgetProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartWidget({
  title,
  description,
  children,
  className,
}: ChartWidgetProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Mock chart components for demonstration
export function BarChart({
  data,
  height = 300,
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="space-y-3" style={{ height }}>
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>{item.name}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LineChart({
  data,
  height = 300,
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue;

  return (
    <div className="relative" style={{ height }}>
      <svg className="w-full h-full">
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          points={data
            .map((item, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - ((item.value - minValue) / range) * 80;
              return `${x}%,${y}%`;
            })
            .join(' ')}
        />
      </svg>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        {data.map((item, index) => (
          <span key={index}>{item.name}</span>
        ))}
      </div>
    </div>
  );
}

export function PieChart({
  data,
  height = 300,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex items-center justify-center gap-8" style={{ height }}>
      <div className="relative" style={{ width: height * 0.6, height: height * 0.6 }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {data.reduce(
            (acc, item, index) => {
              const percentage = (item.value / total) * 100;
              const startAngle = acc.currentAngle;
              const endAngle = startAngle + (percentage / 100) * 360;

              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              const largeArcFlag = percentage > 50 ? 1 : 0;

              const startX = 50 + 40 * Math.cos(startRad);
              const startY = 50 + 40 * Math.sin(startRad);
              const endX = 50 + 40 * Math.cos(endRad);
              const endY = 50 + 40 * Math.sin(endRad);

              const pathData = [
                `M 50 50`,
                `L ${startX} ${startY}`,
                `A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                `Z`,
              ].join(' ');

              acc.elements.push(
                <path
                  key={index}
                  d={pathData}
                  fill={item.color}
                  className="transition-all hover:opacity-80"
                />
              );

              return {
                elements: acc.elements,
                currentAngle: endAngle,
              };
            },
            { elements: [] as React.ReactNode[], currentAngle: 0 }
          ).elements}
        </svg>
      </div>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm">
              {item.name}: {item.value} ({((item.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AreaChart({
  data,
  height = 300,
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  const points = data
    .map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((item.value - minValue) / range) * 80;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="relative" style={{ height }}>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon fill="url(#areaGradient)" points={areaPoints} />
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.5"
          points={points}
        />
      </svg>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        {data.map((item, index) => (
          <span key={index}>{item.name}</span>
        ))}
      </div>
    </div>
  );
}
