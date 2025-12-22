import { Card } from "@AnchorProtocol/ui";

interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

export function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">
        {value.toLocaleString()}
      </p>
    </Card>
  );
}
