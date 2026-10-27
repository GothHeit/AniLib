import { FullscreenStage } from "@/components/player/FullscreenStage";

export default function WatchLayout({ children }: LayoutProps<"/[locale]/watch">) {
  return <FullscreenStage>{children}</FullscreenStage>;
}
