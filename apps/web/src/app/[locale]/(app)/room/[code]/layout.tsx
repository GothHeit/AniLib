import { FullscreenStage } from "@/components/player/FullscreenStage";

export default function RoomLayout({ children }: LayoutProps<"/[locale]/room/[code]">) {
  return <FullscreenStage>{children}</FullscreenStage>;
}
