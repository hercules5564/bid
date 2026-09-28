import {
  Cpu,
  Palette,
  Watch,
  Footprints,
  Gamepad2,
  Car,
  Gem,
  Camera,
  Guitar,
  Package,
  type LucideProps,
} from "lucide-react";

const MAP: Record<string, React.ComponentType<LucideProps>> = {
  cpu: Cpu,
  palette: Palette,
  watch: Watch,
  footprints: Footprints,
  "gamepad-2": Gamepad2,
  car: Car,
  gem: Gem,
  camera: Camera,
  guitar: Guitar,
  package: Package,
};

export function CategoryIcon({ icon, ...props }: { icon: string } & LucideProps) {
  const Cmp = MAP[icon] ?? Package;
  return <Cmp {...props} />;
}
